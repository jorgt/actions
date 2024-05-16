const cds = require("@sap/cds");
const LOG = cds.log("actions");
const axios = require("axios");
const { Engine } = require("json-rules-engine");
const { v4 } = require("uuid");
const zod = require("zod");

const db = cds.connect.to("db");

const getActionsForVehicle = async (Vehicles, id) => {
  const vehicle = await SELECT.one.from(Vehicles, id, (v) => {
    v`.*`,
      v.status((s) => {
        s`.*`,
          s.actions((a) => {
            a`.*`, a.action("*");
          });
      });
  });

  const actions = vehicle?.status?.actions || [];
  return actions;
};

const fetcher = async (definition, { ID }) => {
  try {
    const result = await axios.get(`${definition.service}/${definition.entitySet}(${ID})`);
    return result;
  } catch (e) {
    console.log(e);
  }
};

const isNumber = (n) => !isNaN(parseFloat(str)) && isFinite(str);
const isBool = (n) => str.toLowerCase() === "true" || str.toLowerCase() === "false";
const isDate = (n) => !isNaN(Date.parse(str));

const valueChecker = (value) => {
  if (isNumber(value)) return Number(value);
  if (isBool(value)) return Boolean(value === "true");
  if (isDate(value)) return new Date(value);
};

const dataTypeAction = async (ID, action) => {
  const engine = new Engine();
  const definition = {
    service: "http://localhost:4006/odata/v4/test",
    entitySet: "Vehicle",
    rules: [
      {
        fact: "stock",
        operator: "greaterThanInclusive",
        value: 2,
      },
    ],
  };

  const { data } = await fetcher(definition, { ID });

  definition.rules.forEach((rule) => {
    engine.addRule({
      conditions: {
        any: [rule],
      },
      event: {
        type: rule.fact,
        params: {
          message: `Rule not met: ${rule.fact} ${rule.operator} ${rule.value}`,
        },
      },
    });
  });

  const { events, failureEvents } = await engine.run(data);

  console.log(data, events, failureEvents);
  return {
    success: failureEvents.length === 0,
    message: events[0]?.params?.message || failureEvents[0]?.params?.message,
  };
};

const actionTypes = {
  D: dataTypeAction,
};

const actionWrapper = async ({ action, ...status }, Entity, ID) => {
  const { ActionLog } = cds.entities("actions");

  LOG.info("> running action", action.name);
  const { success, message } = await actionTypes[action.type](ID, action);
  const status_ID = success ? status.statusOnPassed_ID : status.statusOnFail_ID;

  if (status_ID) {
    await UPDATE(Entity).with({ status_ID }).where({ ID: ID });
  }

  await INSERT.into(ActionLog).entries({ entity: ID, entityType: "vehicle", success, message, action_ID: action.ID, fromStatus_ID: status.status_ID, toStatus_ID: status_ID });

  return success;
};

module.exports = class AdminService extends cds.ApplicationService {
  init() {
    const { Actions, DataActions, Vehicles } = this.entities;
    /*****************
     * VEHICLE ACTIONS
     *****************/
    this.on("execute", Vehicles, async ({ params: [id], data: { action } }, res) => {
      const actions = await getActionsForVehicle(Vehicles, id);

      let nextAction = actions.find((a) => a.action.name === action && a.action.userAction);
      /**
       * considerations:
       * - if there are multiple next actions to run simulatiounsly , we throw an error. this is inconsistent.
       * - should we read the vehicle after every action to see if the status changed?
       */
      while (nextAction) {
        LOG.info("found action", nextAction.action.name);
        const result = await actionWrapper(nextAction, Vehicles, id);
        if (!result) break;
        const allNextActions = actions.filter((a) => a.parent_ID === nextAction.ID);
        if (allNextActions.length > 1) throw new Error("Ambiguous next action");
        nextAction = allNextActions[0];
      }

      LOG.info("< done");
    });

    this.on("getActions", Vehicles, async ({ params: [id] }) => {
      return (await getActionsForVehicle(Vehicles, id)).map((a) => a.action).filter((a) => a.userAction);
    });

    /*****************
     * GENERAL ACTIONS
     *****************/
    this.on("createDataAction", async ({ data }) => {
      const { action, definition } = data;

      try {
        const ID = v4();
        const a = { ID, type: "D", ...action };
        const b = { action_ID: ID, ...definition };
        await cds.tx(async (tx) => {
          const [act] = await tx.create(Actions, [a]);
          const [def] = await tx.create(DataActions, [b]);
        });

        return {
          action: a,
          definition: b,
        };
        // const actionResults = await INSERT.into(Actions).entries([action]);
        // const definitionResults = await INSERT.into(DataActions).entries([definition]);
        // return {
        //   action,
        //   definition
        // }
      } catch (e) {
        console.log(e);
      }
    });

    this.on("getDataActionById", async ({ data: { ID } }) => {
      return await cds.tx(async (tx) => {
        const act = await tx.run(SELECT.one.from(Actions).where({ ID }));
        const def = await tx.run(SELECT.one.from(DataActions).where({ action_ID: act.ID }));
        return {
          action: act,
          definition: def,
        }
      });
    });

    this.on("getDataActionByName", async ({ data: { name } }) => {
      console.log(name);
      try {
        return await cds.tx(async (tx) => {
          const act = await tx.run(SELECT.one.from(Actions).where({ name }));
          const def = await tx.run(SELECT.one.from(DataActions).where({ action_ID: act.ID }));
          return {
            action: act,
            definition: def,
          }
        });
      } catch(e) {
         return {} 
      }
    });

    return super.init();
  }
};
