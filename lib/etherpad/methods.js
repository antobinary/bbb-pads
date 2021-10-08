const logger = require('../utils/logger');

const AUTHOR_ID = 'authorID';
const GROUP_ID = 'groupID';
const PAD_ID = 'padID';
const SESSION_ID = 'sessionID';
const SOURCE_ID = 'sourceID';
const DESTINATION_ID = 'destinationID';
const READ_ONLY_ID = 'readOnlyID';

const AUTHOR_NAME = 'name';
const PAD_NAME = 'padName';

const HTML = 'html';
const REV = 'rev';
const TEXT = 'text';
const FORCE = 'force';

const VALID_UNTIL = 'validUntil';
const START_REV = 'startRev';
const END_REV = 'endRev';
const PUBLIC_STATUS = 'publicStatus';

const methods = {
  createGroup: {
    params: {
      mandatory: [],
      optional: [],
    },
  },
  deleteGroup: {
    params: {
      mandatory: [GROUP_ID],
      optional: [],
  },
  listPads: {
    params: {
      mandatory: [GROUP_ID],
      optional: [],
    },
  },
  createGroupPad: {
    params: {
      mandatory: [GROUP_ID, PAD_NAME],
      optional: [TEXT],
    },
  },
  listAllGroups: {
    params: {
      mandatory: [],
      optional: [],
    },
  },
  createAuthor: {
    params: {
      mandatory: [],
      optional: [AUTHOR_NAME],
    },
  },
  listPadsOfAuthor: {
    params: {
      mandatory: [AUTHOR_ID],
      optional: [],
    },
  },
  getAuthorName: {
    params: {
      mandatory: [AUTHOR_ID],
      optional: [],
    },
  },
  createSession: {
    params: {
      mandatory: [GROUP_ID, AUTHOR_ID, VALID_UNTIL],
      optional: [],
    },
  },
  deleteSession: {
    params: {
      mandatory: [SESSION_ID],
      optional: [],
    },
  },
  getSessionInfo: {
    params: {
      mandatory: [SESSION_ID],
      optional: [],
    },
  },
  listSessionsOfGroup: {
    params: {
      mandatory: [GROUP_ID],
      optional: [],
    },
  },
  listSessionsOfAuthor: {
    params: {
      mandatory: [AUTHOR_ID],
      optional: [],
    },
  },
  getText: {
    params: {
      mandatory: [PAD_ID],
      optional: [REV],
    },
  },
  setText: {
    params: {
      mandatory: [PAD_ID, TEXT],
      optional: [],
    },
  },
  appendText: {
    params: {
      mandatory: [PAD_ID, TEXT],
      optional: [],
    },
  },
  getHTML: {
    params: {
      mandatory: [PAD_ID],
      optional: [REV],
    },
  },
  setHTML: {
    params: {
      mandatory: [PAD_ID, HTML],
      optional: [],
    },
  },
  getAttributePool: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  getRevisionChangeset: {
    params: {
      mandatory: [PAD_ID],
      optional: [REV],
    },
  },
  createDiffHTML: {
    params: {
      mandatory: [PAD_ID, START_REV, END_REV],
      optional: [],
    },
  },
  restoreRevision: {
    params: {
      mandatory: [PAD_ID, REV],
      optional: [],
    },
  },
  createPad: {
    params: {
      mandatory: [PAD_ID],
      optional: [TEXT],
    },
  },
  getRevisionsCount: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  getSavedRevisionsCount: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  listSavedRevisions: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  saveRevision: {
    params: {
      mandatory: [PAD_ID],
      optional: [REV],
    },
  },
  padUsersCount: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  padUsers: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  deletePad: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  copyPad: {
    params: {
      mandatory: [SOURCE_ID, DESTINATION_ID],
      optional: [FORCE],
    },
  },
  copyPadWithoutHistory: {
    params: {
      mandatory: [SOURCE_ID, DESTINATION_ID],
      optional: [FORCE],
    },
  },
  movePad: {
    params: {
      mandatory: [SOURCE_ID, DESTINATION_ID],
      optional: [FORCE],
    },
  },
  getReadOnlyID: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  getPadID: {
    params: {
      mandatory: [READ_ONLY_ID],
      optional: [],
    },
  },
  setPublicStatus: {
    params: {
      mandatory: [PAD_ID, PUBLIC_STATUS],
      optional: [],
    },
  },
  getPublicStatus: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  listAuthorsOfPad: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  getLastEdited: {
    params: {
      mandatory: [PAD_ID],
      optional: [],
    },
  },
  checkToken: {
    params: {
      mandatory: [],
      optional: [],
    },
  },
  listAllPads: {
    params: {
      mandatory: [],
      optional: [],
    },
  },
  getStats: {
    params: {
      mandatory: [],
      optional: [],
    },
  },
};

const valid = (method, params) => {
  if (!methods.hasOwnProperty(method)) {
    logger.error('methods', 'invalid', method);

    return false;
  } else {
    const {
      mandatory,
      optional,
    } = methods[method].params;

    mandatory.forEach(param => {
      if (!params.hasOwnProperty(param)) {
        logger.error('methods', 'invalid', param);

        return false;
      }
    });

    const all = [...mandatory, ...optional];
    const contains = Object.keys(params).every(param => {
      return all.includes(param);
    });

    if (!contains) {
      logger.error('methods', 'invalid', params);

      return false;
    }
  }

  return true;
};

module.exports {
  methods,
  valid,
};