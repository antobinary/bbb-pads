const mapper = require('./mapper');
const sender = require('./sender');
const api = require('../etherpad/api');
const {
  ids,
  roles,
} = require('../utils/constants');
const Logger = require('../utils/logger');

const logger = new Logger('database');

const models = {
  notes: {
    permissions: {
      MODERATOR: true,
      VIEWER: true,
    },
    sessions: 0,
  },
  captions: {
    permissions: {
      MODERATOR: true,
      VIEWER: false,
    },
    sessions: 1,
  },
};

const database = {};

const findGroup = (meetingId, { externalId, model }) => {
  if (hasMeeting(meetingId)) {
    const groupIds = getGroupIds(meetingId);

    return groupIds.find(groupId => {
      const group = database[meetingId].groups[groupId];

      return group.externalId === externalId && group.model === model;
    });
  }

  return null;
};

const getUserIds = (meetingId) => {
  if (hasMeeting(meetingId)) return Object.keys(database[meetingId].users);

  return [];
};

const getGroupIds = (meetingId) => {
  if (hasMeeting(meetingId)) return Object.keys(database[meetingId].groups);

  return [];
};

const getSessions = (meetingId, groupId) => {
  if (hasGroup(meetingId, groupId)) return Object.keys(database[meetingId].groups[groupId].sessions);

  return [];
};

const getPadIds = (meetingId, groupId) => {
  if (hasGroup(meetingId, groupId)) return Object.keys(database[meetingId].groups[groupId].pads);

  return [];
};

const hasMeeting = (meetingId) => {
  if (database[meetingId]) return true;

  logger.warn(ids.MEETING, 'missing', { meetingId });

  return false;
};

const hasUser = (meetingId, userId) => {
  if (hasMeeting(meetingId)) {
    if (database[meetingId].users[userId]) return true;

    logger.warn(ids.USER, 'missing', { meetingId, userId });
  }

  return false;
};

const hasGroup = (meetingId, groupId) => {
  if (hasMeeting(meetingId)) {
    if (database[meetingId].groups[groupId]) return true;

    logger.warn(ids.GROUP, 'missing', { meetingId, groupId });
  }

  return false;
};

const hasSession = (meetingId, groupId, userId) => {
  if (hasGroup(meetingId, groupId)) {
    if (database[meetingId].groups[groupId].sessions[userId]) return true;

    logger.warn(ids.SESSION, 'missing', { meetingId, groupId, userId });
  }

  return false;
};

const hasPad = (meetingId, groupId, padId) => {
  if (hasGroup(meetingId, groupId)) {
    if (database[meetingId].groups[groupId].pads[padId]) return true;

    logger.warn(ids.PAD, 'missing', { meetingId, groupId, padId });
  }

  return false;
};

const hasPermission = (meetingId, groupId, userId) => {
  if (hasGroup(meetingId, groupId) && hasUser(meetingId, userId)) {
    const { model } = database[meetingId].groups[groupId];
    const { role } = database[meetingId].users[userId];

    if (models[model].permissions[role]) return true;

    logger.warn('permission', 'missing', { meetingId, groupId, userId });
  }

  return false;
};

const isModerator = (meetingId, userId) => {
  if (hasUser(meetingId, userId)) {
    const { role } = database[meetingId].users[userId];

    return role === roles.MODERATOR;
  }

  return false;
};

const createMeeting = ({
  meetingId,
  locked,
}) => {
  return new Promise((resolve, reject) => {
    if (database[meetingId]) {
      logger.warn(ids,MEETING, 'duplicated', { meetingId });

      return reject();
    }
    logger.debug(ids.MEETING, 'created', { meetingId });

    database[meetingId] = {
      locked,
      users: {},
      groups: {},
    };

    resolve(database[meetingId]);
  });
};

const deleteMeeting = (meetingId) => {
  return new Promise((resolve, reject) => {
    if (hasMeeting(meetingId)) {
      const groupIds = getGroupIds(meetingId);
      const promises = groupIds.map(groupId => deleteGroup(meetingId, { groupId }));

      const update = () => {
        const userIds = getUserIds(meetingId);
        userIds.forEach(userId => deleteUser(meetingId, { userId }));
        logger.debug(ids.MEETING, 'deleted', { meetingId });
        delete database[meetingId];

        resolve();
      };

      if (promises.length !== 0) {
        Promise.all(promises).then(() => update()).catch(() => {
          logger.error(ids.MEETING, 'deleting', { meetingId });

          reject();
        });
      } else {
        update();
      }
    } else {
      resolve();
    }
  });
};

const lockMeeting = (meetingId) => {
  return new Promise((resolve, reject) => {
    if (hasMeeting(meetingId)) {
      const userIds = getUserIds(meetingId);
      const promises = userIds.map(userId => lockUser(meetingId, { userId }));

      const update = () => {
        logger.debug(ids.MEETING, 'locked', { meetingId });
        database[meetingId].locked = true;

        resolve();
      };

      if (promises.length !== 0) {
        Promise.all(promises).then(() => update()).catch(() => {
          logger.error(ids.MEETING, 'locking', { meetingId });

          reject();
        });
      } else {
        update();
      }
    } else {
      resolve();
    }
  });
};

const unlockMeeting = (meetingId) => {
  return new Promise((resolve, reject) => {
    if (hasMeeting(meetingId)) {
      logger.debug(ids.MEETING, 'unlocked', { meetingId });
      database[meetingId].locked = false;

      resolve();
    } else {
      resolve();
    }
  });
};

const createUser = (meetingId, {
  userId,
  name,
  role,
  locked,
}) => {
  return new Promise((resolve, reject) => {
    if (hasMeeting(meetingId)) {
      if (database[meetingId].users[userId]) {
        logger.warn(ids.USER, 'duplicated', { meetingId, userId });

        return reject();
      }

      api.call('createAuthor', { name }).then(response => {
        const authorId = response.authorID;
        logger.debug(ids.USER, 'created', { meetingId, userId, authorId });
        database[meetingId].users[userId] = {
          authorId,
          name,
          role,
          locked,
        };

        mapper.createUser(meetingId, userId, authorId);

        resolve(database[meetingId].users[userId]);
      }).catch(() => {
        logger.error(ids.USER, 'creating', { meetingId, userId });

        reject();
      });
    } else {
      reject();
    }
  });
};

const deleteUser = (meetingId, { userId }) => {
  return new Promise((resolve, reject) => {
    if (hasUser(meetingId, userId)) {
      const groupIds = getGroupIds(meetingId);
      const promises = groupIds.map(groupId => deleteSession(meetingId, groupId, userId));

      const update = () => {
        const { authorId } = database[meetingId].users[userId];
        mapper.deleteUser(authorId);

        logger.debug(ids.USER, 'deleted', { meetingId, userId, authorId });
        delete database[meetingId].users[userId];

        resolve();
      };

      if (promises.length !== 0) {
        Promise.all(promises).then(() => update()).catch(() => {
          logger.error(ids.USER, 'deleting', { meetingId, userId });

          reject();
        });
      } else {
        update();
      }
    } else {
      resolve();
    }
  });
};

const lockUser = (meetingId, { userId }) => {
  return new Promise((resolve, reject) => {
    if (hasUser(meetingId, userId) && !isModerator(meetingId, userId)) {
      const groupIds = getGroupIds(meetingId);
      const promises = groupIds.map(groupId => deleteSession(meetingId, groupId, userId));

      const update = () => {
        logger.debug(ids.USER, 'locked', { meetingId, userId });
        database[meetingId].users[userId].locked = true;

        resolve();
      };

      if (promises.length !== 0) {
        Promise.all(promises).then(() => update()).catch(() => {
          logger.error(ids.USER, 'locking', { meetingId, userId });

          reject();
        });
      } else {
        update();
      }
    } else {
      resolve();
    }
  });
};

const unlockUser = (meetingId, { userId }) => {
  return new Promise((resolve, reject) => {
    if (hasUser(meetingId, userId)) {
      logger.debug(ids.USER, 'unlocked', { meetingId, userId });
      database[meetingId].users[userId].locked = false;

      resolve();
    } else {
      resolve();
    }
  });
};

const promoteUser = (meetingId, { userId }) => {
  return new Promise((resolve, reject) => {
    if (hasUser(meetingId, userId)) {
      logger.debug(ids.USER, 'promoted', { meetingId, userId });
      database[meetingId].users[userId].role = roles.MODERATOR;

      resolve();
    } else {
      resolve();
    }
  });
};

const demoteUser = (meetingId, { userId }) => {
  return new Promise((resolve, reject) => {
    if (hasUser(meetingId, userId) && isModerator(meetingId, userId)) {
      const groupIds = getGroupIds(meetingId);
      const promises = groupIds.map(groupId => deleteSession(meetingId, groupId, userId));

      const update = () => {
        logger.debug(ids.USER, 'demoted', { meetingId, userId });
        database[meetingId].users[userId].role = roles.VIEWER;

        resolve();
      };

      if (promises.length !== 0) {
        Promise.all(promises).then(() => update()).catch(() => {
          logger.error(ids.USER, 'demoting', { meetingId, userId });

          reject();
        });
      } else {
        update();
      }
    } else {
      resolve();
    }
  });
};

const createGroup = (meetingId, {
  externalId,
  model,
}) => {
  return new Promise((resolve, reject) => {
    if (hasMeeting(meetingId)) {
      if (findGroup(meetingId, { externalId, model })) {
        logger.warn(ids.GROUP, 'duplicated', { meetingId, externalId, model });

        return reject();
      }

      api.call('createGroup').then(response => {
        const groupId = response.groupID;
        logger.debug(ids.GROUP, 'created', { meetingId, groupId, externalId, model });
        database[meetingId].groups[groupId] = {
          externalId,
          model,
          pads: {},
          sessions: {},
        };

        sender.send('groupCreated', meetingId, { groupId, externalId, model });

        resolve(database[meetingId].groups[groupId]);
      }).catch(() => {
        logger.error(ids.GROUP, 'creating', { meetingId, externalId, model });

        reject();
      });
    } else {
      reject();
    }
  });
};

const deleteGroup = (meetingId, { groupId }) => {
  return new Promise((resolve, reject) => {
    if (hasGroup(meetingId, groupId)) {
      const sessions = getSessions(meetingId, groupId);
      const promises = sessions.map(session => deleteSession(meetingId, groupId, session));

      const update = () => {
        const padIds = getPadIds(meetingId, groupId);
        padIds.forEach(padId => deletePad(meetingId, groupId, padId));
        logger.debug(ids.GROUP, 'deleted', { meetingId, groupId });
        delete database[meetingId].groups[groupId];

        resolve();
      };

      if (promises.length !== 0) {
        Promise.all(promises).then(() => update()).catch(() => {
          logger.error(ids.GROUP, 'deleting', { meetingId, groupId });

          reject();
        });
      } else {
        update();
      }
    } else {
      resolve();
    }
  });
};

const createPad = (meetingId, groupId, { name }) => {
  return new Promise((resolve, reject) => {
    if (hasGroup(meetingId, groupId)) {
      const padId = `${groupId}$${name}`;
      if (database[meetingId].groups[groupId].pads[padId]) {
        logger.warn(ids.PAD, 'duplicated', { meetingId, padId });

        return reject();
      }

      api.call('createGroupPad', { groupID: groupId, padName: name }).then(response => {
        logger.debug(ids.PAD, 'created', { meetingId, groupId, padId });
        database[meetingId].groups[groupId].pads[padId] = { name };

        mapper.createPad(meetingId, groupId, padId);

        sender.send('padCreated', meetingId, { groupId, padId, name });

        resolve(database[meetingId].groups[groupId].pads[padId]);
      }).catch(() => {
        logger.error(ids.PAD, 'creating', { meetingId, padId });

        reject();
      });
    } else {
      reject();
    }
  });
};

const deletePad = (meetingId, groupId, padId) => {
  if (hasPad(meetingId, groupId, padId)) {
    mapper.deletePad(padId);

    logger.debug(ids.PAD, 'deleted', { meetingId, groupId, padId });
    delete database[meetingId].groups[groupId].pads[padId];
  }
};

const updatePad = (padId, { authorId, rev, changeset }) => {
  return new Promise((resolve, reject) => {
    const pad = mapper.getPad(padId);
    const user = mapper.getUser(authorId);
    if (pad && user) {
      const {
        meetingId,
        groupId,
      } = pad;

      const { userId } = user;
      database[meetingId].groups[groupId].pads[padId].last = {
        userId,
        rev,
        changeset,
      };

      sender.send('padUpdated', meetingId, { padId, userId, rev, changeset });

      resolve(database[meetingId].groups[groupId].pads[padId]);
    } else {
      reject();
    }
  });
};

const createSession = (meetingId, groupId, userId) => {
  return new Promise((resolve, reject) => {
    if (hasPermission(meetingId, groupId, userId)) {
      if (database[meetingId].groups[groupId].sessions[userId]) {
        logger.warn(ids.SESSION, 'duplicated', { meetingId, groupId, userId });

        return reject();
      }

      const { authorId } = database[meetingId].users[userId];
      api.call('createSession', groupId, authorId, 0).then(response => {
        const sessionId = response.sessionID;
        logger.debug(ids.SESSION, 'created', { meetingId, groupId, userId, sessionId });
        database[meetingId].groups[groupId].sessions[userId] = { sessionId };

        sender.send('sessionCreated', meetingId, { groupId, userId, sessionId });

        resolve(database[meetingId].groups[groupId].sessions[userId]);
      }).catch(() => {
        logger.error(ids.SESSION, 'creating', { meetingId, groupId, userId });

        reject();
      });
    } else {
      reject();
    }
  });
};

const deleteSession = (meetingId, groupId, userId) => {
  return new Promise((resolve, reject) => {
    if (hasSession(meetingId, groupId, userId)) {
      const sessionId = database[meetingId].groups[groupId].sessions[userId];
      api.call('deleteSession', { sessionID: sessionId }).then(response => {
        logger.debug(ids.SESSION, 'deleted', { meetingId, groupId, userId });
        delete database[meetingId].groups[groupId].session[userId];

        sender.send('sessionDeleted', meetingId, { groupId, userId });

        resolve();
      }).catch(() => {
        logger.error(ids.SESSION, 'deleting', { meetingId, groupId, userId });

        reject();
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  createMeeting,
  lockMeeting,
  unlockMeeting,
  deleteMeeting,
  createUser,
  deleteUser,
  lockUser,
  unlockUser,
  promoteUser,
  demoteUser,
  createGroup,
  createPad,
  updatePad,
  createSession,
};