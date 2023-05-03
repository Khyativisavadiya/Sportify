import { timeSlot, sportPlaces, sports } from "../../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import * as validation from "./helpers.js";


const getvenuebyuserid = async (ID) => {
    ID = validation.checkId(ID, "ID");
    const VenueCollection = await timeSlot();
    const sportCollection = await sports();
    const sportplaceCollection = await sportPlaces();
    const sport = await sportCollection.find({}).toArray();
    const sportplace = await sportplaceCollection.find({}).toArray();
    const Venue = await VenueCollection.find({ userID: ID, bookingType: 1 }).toArray();
    // for (let i = 0; i < Venue.length; i++) {
    //     let item = {};
    //     if (Venue[i]["slotID"] = 1) {
    //         item["slotName"] = "12:00AM to 08:00AM";
    //     }
    //     else if (Venue[i]["slotID"] = 2) {
    //         item["slotName"] = "08:00AM to 04:00PM";
    //     }
    //     else {
    //         item["slotName"] = "04:00PM to 12:00AM";
    //     }
    //     Venue.push(item);
    // }
    let arr = [];

    for (let i = 0; i < Venue.length; i++) {
        let item = { "Date": Venue[i].Date, "slotID": Venue[i].slotID, "sportID": Venue[i].sportID, "sportPlaceID": Venue[i].sportPlaceID };

        for (let j = 0; j < sport.length; j++) {
            if (sport[j]._id == Venue[i].sportID) {
                item["sportName"] = sport[j].name;
            }
        }
        arr.push(item);
    }
    for (let i = 0; i < arr.length; i++) {
        // let item = { "Date": Venue[i].Date, "slotID": Venue[i].slotID, "sportPlaceID": Venue[i].sportPlaceID };
        for (let k = 0; k < sportplace.length; k++) {
            if (sportplace[k].sportID == arr[i].sportID && sportplace[k]._id == arr[i].sportPlaceID) {
                arr[i]["sportPlaceName"] = sportplace[k].name;
                arr[i]["address"] = sportplace[k].address;
                arr[i]["description"] = sportplace[k].description;
                arr[i]["price"] = sportplace[k].price;
                arr[i]["capacity"] = sportplace[k].capacity;
                if (arr[i]["slotID"] == 1) {
                    arr[i]["slotName"] = "12:00AM to 08:00AM";
                }
                else if (arr[i]["slotID"] == 2) {
                    arr[i]["slotName"] = "08:00AM to 04:00PM";
                }
                else {
                    arr[i]["slotName"] = "04:00PM to 12:00AM";
                }
            }
        }

    }
    // return arr;

    // const Venue1 = await VenueCollection.aggregate([
    //     {
    //         $match: {
    //             userID: ID
    //         }
    //     },
    //     {
    //         $match: {
    //             bookingType: 1
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: 'sports',
    //             localField: 'sportID',
    //             foreignField: '_id',
    //             as: 'sports'
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: sportplaceCollection,
    //             localField: 'sportPlaceID',
    //             foreignField: '_id',
    //             as: 'sportPlace'
    //         }
    //     },
    //     // {
    //     //     $unwind: '$sportPlaces'
    //     // },
    //     // {
    //     //     $project: {            
    //     //       'sports.name': 1,
    //     //       'sportPlaces.price': 1,
    //     //       'sportPlaces.name': 1,
    //     //       'sportPlaces.address': 1,
    //     //       'sportPlaces.description': 1,
    //     //       'sportPlaces.capacity': 1,
    //     //       'sportPlaces.rating': 1
    //     //     }
    //     //   }


    // ]).toArray();


    //
    if (!arr) throw "Error: Venue can not be found";
    return arr;
};

export { getvenuebyuserid };