using { test } from '../db/test';
using { actions } from '../db/schema';

service TestService {
  entity Vehicle as projection on test.Vehicle;
  entity Statuses as projection on actions.Statuses;
}