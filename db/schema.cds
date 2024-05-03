using {
  cuid,
  managed
} from '@sap/cds/common';

namespace actions;

entity Actions : cuid, managed {
  @mandatory
  name        : String;
  description : String;
  userAction  : Boolean;

  @mandatory
  type        : String enum {
    COMPLEX     = 'C';
    DATA        = 'D';
    ONPREMISE   = 'O';
    STATUS_ONLY = 'S';
  };

  statuses    : Association to many Action_Status
                  on statuses.action = $self;
}

entity Statuses : cuid, managed {
  name        : String;
  description : String;
  actions     : Association to many Action_Status
                  on actions.status = $self;
}

@assert.unique: {item: [
  action,
  status
]}
entity Action_Status : cuid, managed {
  action         : Association to Actions;
  status         : Association to Statuses;
  parent         : Association to Action_Status;
  statusOnPassed : Association to Statuses;
  statusOnFail   : Association to Statuses;
}

entity ActionLog : cuid, managed {
  entity     : UUID;
  entityType : String;
  action     : Association to Actions;
  success    : Boolean;
  message    : String;
  fromStatus : Association to Statuses;
  toStatus   : Association to Statuses;
}
