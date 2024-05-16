using {
  cuid,
  managed
} from '@sap/cds/common';

namespace actions;

type ActionType : String enum {
  COMPLEX                = 'C';
  DATA                   = 'D';
  ONPREMISE              = 'O';
  STATUS_ONLY            = 'S';
};

/**
 * STANDARD ACTION
 */
aspect action : cuid, managed {
  // @mandatory
  name        : String;
  description : String;
  userAction  : Boolean;

  // @mandatory
  type        : ActionType;
}

type Action: action {}

@assert.unique: {item: [
  name
]}
entity Actions : action {
  statuses : Association to many Action_Status
               on statuses.action = $self;
}

/**
 * DATA ACTION
 * this is the type of action that calls a service and runs rules over any of the fields with conditions
 */
type Operator   : String enum {
  EQUAL                  = 'equal';
  NOT_EQUAL              = 'notEqual';
  LESS_THAN              = 'lessThan';
  LESS_THAN_INCLUSIVE    = 'lessThanInclusive';
  GREATER_THAN           = 'greaterThan';
  GREATER_THAN_INCLUSIVE = 'greaterThanInclusive';
  ![IN]                  = 'in';
  NOT_IN                 = 'notIn';
  CONTAINS               = 'contains';
  DOES_NOT_CONTAIN       = 'doesNotContain';
}

aspect rule : {
  field    : String;
  operator : Operator;
  value    : String;
}

type Rule       : rule {}

aspect dataAction : cuid, managed {
  action  : Association to one Actions;
  service : String;
  entity  : String;
  rules : array of Rule;
}

type DataAction: dataAction {};

entity DataActions : dataAction {};

/**
 * STATUS DEFINITIONS
 */
entity Statuses : cuid, managed {
  name        : String;
  description : String;
  actions     : Association to many Action_Status
                  on actions.status = $self;
}

/**
 * JUNCTION TABLE BETWEEN Action AND Status
 */
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

/**
 * LOGS
 */
entity ActionLog : cuid, managed {
  entity     : UUID;
  entityType : String;
  action     : Association to Actions;
  success    : Boolean;
  message    : String;
  fromStatus : Association to Statuses;
  toStatus   : Association to Statuses;
}
