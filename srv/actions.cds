using { actions } from '../db/schema';
using { test } from '../db/test';

type DataAction: {
  action: actions.Action;
  definition: actions.DataAction;
}
type GenericAction: {
  action: actions.Action;
  definition: String;
}

service ActionService {
  entity Actions as projection on actions.Actions;
  entity Statuses as projection on actions.Statuses;
  entity ActionStatuses as projection on actions.Action_Status;
  entity ActionLog as projection on actions.ActionLog;
  entity DataActions as projection on actions.DataActions;

  entity Vehicles as projection on test.Vehicle { * } actions {
    action execute(action: String) returns Boolean;
    function getActions() returns array of Actions;
  };

  action createDataAction(action: actions.Action, definition: actions.DataAction) returns DataAction;
  function getDataActionById(ID: UUID) returns DataAction;
  function getDataActionByName(name: String) returns DataAction;
}