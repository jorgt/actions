using { cuid, managed } from '@sap/cds/common';
using { actions } from './schema';

namespace test;

entity Vehicle: cuid, managed {
  VIN: String;
  InternalNumber: String;
  manufacturer: String;
  model: String;
  year: Integer;
  stock: Integer;
  status: Association to actions.Statuses;
}