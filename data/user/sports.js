import { sports } from "../../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import * as validation from "./helpers.js";

const create = async (name) => {
  name = validation.helperMethodsForSports.checkString(name, "name");

  let newSport = {
    name: name,
  };

  const sportCollection = await sports();
  const newInsertInformation = await sportCollection.insertOne(newSport);
  if (!newInsertInformation.acknowledged || !newInsertInformation.insertedId)
    throw "Could not add sport!";
  const newId = newInsertInformation.insertedId;

  let addedSport = await get(newId.toString());

  return { insertedSport: addedSport };
};

const getAll = async () => {
  const sportCollection = await sports();
  const sportList = await sportCollection.find({}).toArray();
  return sportList;
};

const get = async (sportID) => {
  sportID = validation.checkId(sportID, "sportID");
  const sportCollection = await sports();
  const sport = await sportCollection.findOne({ _id: new ObjectId(sportID) });
  if (!sport) throw "Error: Sport not found";
  return sport;
};
const getID = async (sportname) => {
  sportname = validation.helperMethodsForSports.checkString(
    sportname,
    "sports Name"
  );
  const sportCollection = await sports();
  const sport = await sportCollection.findOne({ name: sportname });
  if (!sport) throw "Error: Sport not found";
  return sport._id.toString();
};

const getByName = async (name) => {
  const sportCollection = await sports();
  const sport = await sportCollection.findOne({ name: name });
  if (!sport) throw "Error: Sport not found";
  return sport;
};

const remove = async (sportID) => {
  sportID = validation.checkId(sportID, "sportID");
  const sportCollection = await sports();
  const deletionInfo = await sportCollection.findOneAndDelete({
    _id: new ObjectId(sportID),
  });
  if (deletionInfo.lastErrorObject.n === 0)
    throw [404, `Error: Could not delete user with id of ${sportID}`];

  return { deleted: true };
};

const update = async (sportID, name) => {
  sportID = validation.checkId(sportID, "sportID");
  name = validation.checkString(name, "name");

  const sportUpdateInfo = {
    name: name,
  };

  const sportCollection = await sports();
  const updateInfo = await sportCollection.findOneAndUpdate(
    { _id: new ObjectId(sportID) },
    { $set: sportUpdateInfo },
    { returnDocument: "after" }
  );
  if (updateInfo.lastErrorObject.n === 0)
    throw `Error: Update failed, could not find a sport with id of ${sportID}`;

  return { updatedSport: true };
};

export { create, getAll, get, remove, update, getID, getByName };
