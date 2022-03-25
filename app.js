const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const app = express();

app.use(express.json());

const databasePath = path.join(__dirname, "covid19India.db");
let database = null;
const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("server is running at http://localhost:3000/")
    );
  } catch (error) {
    console.log("DB error is ${error.message}");
    process.exit(1);
  }
};
initializeDBAndServer();

const convertStateObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//API 1
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `select * from state;`;
  const statesArray = await database.all(getAllStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateObjectToResponseObject(eachState)
    )
  );
});
//API 2
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `select * from state where state_id=${stateId};`;
  const state = await database.get(getStateQuery);
  response.send(convertStateObjectToResponseObject(state));
});

//API 3

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictsQuery = `
    SELECT
      *
    FROM
     district
    WHERE
      district_id = ${districtId};`;
  const district = await database.get(getDistrictsQuery);
  response.send(convertDistrictObjectToResponseObject(district));
});

//API 4
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statisticsQuery = `select sum(cases) as totalCases ,sum(cured) as totalCured,
sum(active) as totalActive,sum(deaths) as totalDeaths from district 
where state_id=${stateId};`;
  const statics = await database.get(statisticsQuery);
  response.send({
    totalCases: statics.totalCases,
    totalCured: statics.totalCured,
    totalActive: statics.totalActive,
    totalDeaths: statics.totalDeaths,
  });
});

//API 5
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT
      state_name
    FROM
      district
    NATURAL JOIN
      state
    WHERE 
      district_id=${districtId};`;
  const state = await database.get(getStateNameQuery);
  response.send({ stateName: state.state_name });
});

//APP 6
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
  UPDATE
    district
  SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active}, 
    deaths = ${deaths}
  WHERE
    district_id = ${districtId};
  `;

  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//API 7
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictDetails = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await database.run(postDistrictDetails);
  response.send("District Successfully Added");
});

//API 8
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `delete from district where district_id=${districtId};`;
  await database.run(deleteDistrictQuery);
  response.send("District Removed");
});
module.exports = app;
