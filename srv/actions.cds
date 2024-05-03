using { actions } from '../db/schema';
using { test } from '../db/test';

service ActionService {
  entity Actions as projection on actions.Actions;
  entity Statuses as projection on actions.Statuses;
  entity ActionStatuses as projection on actions.Action_Status;
  entity ActionLog as projection on actions.ActionLog;

  entity Vehicles as projection on test.Vehicle { * } actions {
    action execute(action: String) returns Boolean;
    function getActions() returns array of Actions;
  };
}