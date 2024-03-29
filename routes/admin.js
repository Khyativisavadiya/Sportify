import { Router } from "express";
import * as userData from "../data/user/users.js";
import * as userDataAdmin from "../data/admin/users.js";
import * as eventData from "../data/user/events.js";
import * as eventDataAdmin from "../data/admin/events.js";
import * as adminData from "../data/admin/admins.js";
import * as classData from "../data/admin/classes.js";
import * as sportData from "../data/admin/sports.js";
import * as sportPlaceData from "../data/admin/sportPlaces.js";
import validation, { checkUsedEmail } from "../data/admin/helpers.js";
import xss from "xss";
import * as slotData from "../data/admin/timeSlot.js";
import { sendEmail } from "../data/admin/mail.js";
import * as slotUserData from "../data/user/venue.js";
import * as instructorData from "../data/admin/instructor.js";

const router = Router();

// functions
const getGenderOptions = (selected) => {
  let options = [
    "male",
    "female",
    "transgender",
    "non-binary",
    "prefer not to respond",
  ];
  if (selected) {
    const index = options.indexOf(selected);
    if (!index === -1) throw `Error: ${selected} not found in gender`;
    options.splice(index, 1);
  }
  return options;
};

const getSportOptions = async (sportID) => {
  const sportList = await sportData.getAll();
  let sports = [];
  if (sportList) {
    sports = sportList.map((sport) =>
      Object({ sportID: sport._id, name: sport.name })
    );
  }
  if (sportID) {
    const i = sports.findIndex((object) => {
      return object.sportID.toString() === sportID.toString();
    });
    sports.splice(i, 1);
  }
  return sports;
};

const getSportPlaceOptions = async (sportPlaceID) => {
  const sportPlacetList = await sportPlaceData.getAll();
  let sportPlaces = [];
  if (sportPlacetList) {
    sportPlaces = sportPlacetList.map((sportPlace) =>
      Object({
        sportPlaceID: sportPlace._id,
        name: sportPlace.name,
        sportId1: sportPlace.sportID,
      })
    );
  }
  if (sportPlaceID) {
    const i = sportPlaces.findIndex((object) => {
      return object.sportPlaceID.toString() === sportPlaceID.toString();
    });
    sportPlaces.splice(i, 1);
  }
  return sportPlaces;
};
const getSportPlaceOptionswithsport = async (sportID, sportPlaceID) => {
  const sportPlacetList = await sportPlaceData.getbysportid(sportID);
  let sportPlaces = [];
  if (sportPlacetList) {
    sportPlaces = sportPlacetList.map((sportPlace) =>
      Object({
        sportPlaceID: sportPlace._id,
        name: sportPlace.name,
        sportId1: sportPlace.sportID,
      })
    );
  }
  if (sportPlaceID) {
    const i = sportPlaces.findIndex((object) => {
      return object.sportPlaceID.toString() === sportPlaceID.toString();
    });
    sportPlaces.splice(i, 1);
  }
  return sportPlaces;
};

const applyXSS = (req_body) => {
  Object.keys(req_body).forEach(function (key, index) {
    req_body[key] = xss(req_body[key]);
  });
};

// http://localhost:3000/admin/profile
router
  .route("/profile")
  .get(async (req, res) => {
    try {
      let adminInfo = await adminData.get(req.session.admin.adminID);

      const options = getGenderOptions(adminInfo.gender);

      return res.render("admin/profile", {
        title: "Profile",
        hidden: "hidden",
        firstName: adminInfo.firstName,
        lastName: adminInfo.lastName,
        email: adminInfo.email,
        gender: adminInfo.gender,
        genderOptions: options,
        dateOfBirth: adminInfo.dateOfBirth,
        contactNumber: adminInfo.contactNumber,
        newFirstName: adminInfo.firstName,
        newLastName: adminInfo.lastName,
        newEmail: adminInfo.email,
        newGender: adminInfo.gender,
        newDateOfBirth: adminInfo.dateOfBirth,
        newContactNumber: adminInfo.contactNumber,
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  })
  .put(async (req, res) => {
    let adminInfo = req.body;
    if (!adminInfo || Object.keys(adminInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(adminInfo);

    // check id
    let adminID = req.session.admin.adminID;
    adminID = validation.checkId(adminID);

    // validation
    try {
      adminInfo.firstNameInput = validation.checkName(
        adminInfo.firstNameInput,
        "First Name"
      );
      adminInfo.lastNameInput = validation.checkName(
        adminInfo.lastNameInput,
        "Last Name"
      );
      adminInfo.emailInput = validation.checkEmail(
        adminInfo.emailInput,
        "Email"
      );
      adminInfo.dateOfBirthInput = validation.checkDateOfBirth(
        adminInfo.dateOfBirthInput,
        "Date Of Birth"
      );
      adminInfo.contactNumberInput = validation.checkContactNumber(
        adminInfo.contactNumberInput,
        "Contact Number"
      );
      adminInfo.genderInput = validation.checkGender(
        adminInfo.genderInput,
        "Gender"
      );
      adminInfo.passwordInput = validation.checkPassword(
        adminInfo.passwordInput,
        "Password"
      );

      // check email duplicate only when changing the email
      let admin = await adminData.get(adminID);
      if (adminInfo.emailInput !== admin.email)
        await checkUsedEmail(adminInfo.emailInput);
    } catch (e) {
      let origAdminInfo = await adminData.get(req.session.admin.adminID);

      const options = getGenderOptions(adminInfo.genderInput);
      return res.status(400).render("admin/profile", {
        title: "Profile",
        hidden: "",
        error: e,
        firstName: origAdminInfo.firstName,
        lastName: origAdminInfo.lastName,
        email: origAdminInfo.email,
        gender: origAdminInfo.gender,
        genderOptions: options,
        dateOfBirth: origAdminInfo.dateOfBirth,
        contactNumber: origAdminInfo.contactNumber,
        newFirstName: adminInfo.firstNameInput,
        newLastName: adminInfo.lastNameInput,
        newEmail: adminInfo.emailInput,
        newGender: adminInfo.genderInput,
        newDateOfBirth: adminInfo.dateOfBirthInput,
        newContactNumber: adminInfo.contactNumberInput,
      });
    }
    // update
    try {
      const newAdmin = await adminData.update(
        adminID,
        adminInfo.firstNameInput,
        adminInfo.lastNameInput,
        adminInfo.emailInput,
        adminInfo.genderInput,
        adminInfo.dateOfBirthInput,
        adminInfo.contactNumberInput,
        adminInfo.passwordInput
      );
      if (!newAdmin.updatedAdmin) throw "Internal Server Error";

      //send mail
      try {
        await sendEmail(
          adminInfo.emailInput,
          "Your information has been successfully updated!"
        );
      } catch (e) {
        console.log(`Failed to send mail to ${adminInfo.emailInput}`);
      } finally {
        // redirect to profile page even if the mail is not sent
        return res.redirect("profile");
      }
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/register")
  .get(async (req, res) => {
    return res.render("admin/register", {
      title: "Admin Register",
      genderOptions: getGenderOptions(),
    });
  })
  .post(async (req, res) => {
    let adminInfo = req.body;
    if (!adminInfo || Object.keys(adminInfo).length === 0) {
      return tus(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(adminInfo);

    // validation for admin registration
    try {
      adminInfo.firstNameInput = validation.checkName(
        adminInfo.firstNameInput,
        "First Name"
      );
      adminInfo.lastNameInput = validation.checkName(
        adminInfo.lastNameInput,
        "Last Name"
      );
      adminInfo.emailInput = validation.checkEmail(
        adminInfo.emailInput,
        "Email"
      );
      adminInfo.dateOfBirthInput = validation.checkDateOfBirth(
        adminInfo.dateOfBirthInput,
        "Date Of Birth"
      );
      adminInfo.contactNumberInput = validation.checkContactNumber(
        adminInfo.contactNumberInput,
        "Contact Number"
      );
      adminInfo.genderInput = validation.checkGender(
        adminInfo.genderInput,
        "Gender"
      );
      adminInfo.passwordInput = validation.checkPassword(
        adminInfo.passwordInput,
        "Password"
      );
      await checkUsedEmail(adminInfo.emailInput);
    } catch (e) {
      const options = getGenderOptions(adminInfo.genderInput);

      return res.status(400).render("admin/register", {
        title: "Register",
        hidden: "",
        error: e,
        firstName: adminInfo.firstNameInput,
        lastName: adminInfo.lastNameInput,
        email: adminInfo.emailInput,
        gender: adminInfo.genderInput,
        genderOptions: options,
        dateOfBirth: adminInfo.dateOfBirthInput,
        contactNumber: adminInfo.contactNumberInput,
        password: adminInfo.passwordInput,
      });
    }

    try {
      const newAdmin = await adminData.create(
        adminInfo.firstNameInput,
        adminInfo.lastNameInput,
        adminInfo.emailInput,
        adminInfo.genderInput,
        adminInfo.dateOfBirthInput,
        adminInfo.contactNumberInput,
        adminInfo.passwordInput
      );
      if (!newAdmin.insertedAdmin) throw "Internal Server Error";

      //send mail
      try {
        await sendEmail(
          adminInfo.emailInput,
          "Welcome to the family! You are now an admin of Sportify!"
        );
      } catch (e) {
        console.log(`Failed to send mail to ${adminInfo.emailInput}`);
      } finally {
        // redirect to login page even if the mail is not sent
        return res.redirect("login");
      }
    } catch (e) {
      res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/login")
  .get(async (req, res) => {
    if (req.session.user) {
      return res.render("admin/login", {
        title: "Admin Login",
        hidden: "",
        error:
          "Seems like you have already logged in as an user. \nMake sure to login as an admin to access the rest of the admin pages.",
      });
    }
    return res.render("admin/login", { title: "Admin Login" });
  })
  .post(async (req, res) => {
    const admin = req.body;
    if (!admin || Object.keys(admin).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(admin);

    // input checking
    try {
      admin.emailAddressInput = validation.checkEmail(
        admin.emailAddressInput,
        "Email Address"
      );

      admin.passwordInput = validation.checkPassword(
        admin.passwordInput,
        "Password"
      );
    } catch (e) {
      return res.status(400).render("admin/login", {
        title: "Login",
        hidden: "",
        error: e,
        emailAddress: admin.emailAddressInput,
      });
    }
    try {
      const { emailAddressInput, passwordInput } = admin;
      const validAdmin = await adminData.check(
        emailAddressInput,
        passwordInput
      );

      req.session.admin = validAdmin;
      return res.redirect("profile");
    } catch (e) {
      return res.status(400).render("admin/login", {
        title: "Login",
        hidden: "",
        error: e,
        emailAddress: admin.emailAddressInput,
      });
    }
  });

// Get/Post -> admin/db/
router.route("/users").get(async (req, res) => {
  const userList = await userData.getAll();
  const users = userList.map((user) =>
    Object({
      userID: user._id,
      userFirstName: user.firstName,
      userLastName: user.lastName,
    })
  );
  return res.render("admin/users", {
    title: "Users",
    n: users.length,
    users: users,
  });
});

router
  .route("/classes")
  .get(async (req, res) => {
    const sports = await getSportOptions();
    const sportPlaces = await getSportPlaceOptions();
    const classList = await classData.getAll();

    const instructorList = await instructorData.getall();
    const instructors = instructorList.map((instructor) =>
      Object({
        instructorID: instructor._id,
        instructorName: instructor.name,
        sportId1: instructor.sportID,
      })
    );

    let classes = [];
    let passedClasses = [];

    if (classList) {
      classList.forEach((classInfo) => {
        const classDate = new Date(`${classInfo.date}:${classInfo.endTime}`);
        if (classDate < new Date()) {
          passedClasses.push(
            Object({
              classID: classInfo._id,
              className: classInfo.title,
            })
          );
        } else {
          classes.push(
            Object({
              classID: classInfo._id,
              className: classInfo.title,
            })
          );
        }
      });
    }

    return res.render("admin/classes", {
      title: "Classes",
      hidden: "hidden",
      n: classes.length,
      sports: sports,
      sportPlaces: sportPlaces,
      instructors: instructors,
      classes: classes,
      passedClasses: passedClasses,
    });
  })
  .post(async (req, res) => {
    let classInfo = req.body;
    if (!classInfo || Object.keys(classInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(classInfo);

    // validation
    try {
      classInfo.titleInput = validation.checkTitle(
        classInfo.titleInput,
        "Title"
      );
      classInfo.sportIDInput = validation.checkId(
        classInfo.sportIDInput,
        "SportID"
      );
      classInfo.sportplaceIDInput1 = validation.checkId(
        classInfo.sportplaceIDInput1,
        "Sport PlaceID"
      );
      classInfo.capacityInput = validation.checkCapacity(
        classInfo.capacityInput,
        "Capacity"
      );
      classInfo.instructorInput1 = validation.checkId(
        classInfo.instructorInput1,
        "Instructor"
      );
      classInfo.priceInput = validation.checkPrice(
        classInfo.priceInput,
        "Price"
      );
      classInfo.dateInput = validation.checkDate(classInfo.dateInput, "Date");
      classInfo.startTimeInput = validation.checkTime(
        classInfo.startTimeInput,
        "Start Time"
      );
      classInfo.endTimeInput = validation.checkTime(
        classInfo.endTimeInput,
        "End Time"
      );

      validation.checkTimeRange(
        classInfo.startTimeInput,
        classInfo.endTimeInput
      );
    } catch (e) {
      const sports = await getSportOptions();
      const sportPlaces = await getSportPlaceOptions();
      const instructorList = await instructorData.getall();
      const instructors = instructorList.map((instructor) =>
        Object({
          instructorID: instructor._id,
          instructorName: instructor.name,
          sportId1: instructor.sportID,
        })
      );
      const classList = await classData.getAll();
      let classes = [];
      if (classList) {
        classes = classList.map((class_) =>
          Object({
            classID: class_._id,
            className: class_.title,
          })
        );
      }
      return res.status(400).render("admin/classes", {
        title: "Classes",
        hidden: "",
        error: e,
        sports: sports,
        sportPlaces: sportPlaces,
        instructors: instructors,
        classes: classes,
        classTitle: classInfo.titleInput,
        capacity: classInfo.capacityInput,
        instructor: classInfo.instructorInput1,
        price: classInfo.priceInput,
        date: classInfo.dateInput,
        startTime: classInfo.startTimeInput,
        endTime: classInfo.endTimeInput,
      });
    }

    try {
      const newClass = await classData.create(
        classInfo.titleInput,
        classInfo.sportIDInput,
        classInfo.sportplaceIDInput1,
        classInfo.capacityInput,
        classInfo.instructorInput1,
        classInfo.priceInput,
        classInfo.dateInput,
        classInfo.startTimeInput,
        classInfo.endTimeInput
      );
      if (!newClass.insertedClass) throw "Internal Server Error";
      return res.redirect("classes");
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/sports")
  .get(async (req, res) => {
    const sportList = await sportData.getAll();
    const sports = sportList.map((sport) =>
      Object({
        sportID: sport._id,
        sportName: sport.name,
      })
    );
    return res.render("admin/sports", {
      title: "Sports",
      hidden: "hidden",
      n: sports.length,
      sports: sports,
    });
  })
  .post(async (req, res) => {
    let sportInfo = req.body;
    if (!sportInfo || Object.keys(sportInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(sportInfo);

    // validation
    try {
      sportInfo.nameInput = validation.checkTitle(sportInfo.nameInput, "Name");
    } catch (e) {
      const sportList = await sportData.getAll();
      const sports = sportList.map((sport) =>
        Object({
          sportID: sport._id,
          sportName: sport.name,
        })
      );

      return res.status(400).render("admin/sports", {
        title: "Sports",
        hidden: "",
        error: e,
        sports: sports,
        name: sportInfo.nameInput,
      });
    }

    try {
      const newSport = await sportData.create(sportInfo.nameInput);
      if (!newSport.insertedSport) throw "Internal Server Error";
      return res.redirect("sports");
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/sportPlaces")
  .get(async (req, res) => {
    const sports = await getSportOptions();

    const sportPlacetList = await sportPlaceData.getAll();
    const sportPlaces = sportPlacetList.map((sportPlace) =>
      Object({
        sportPlaceID: sportPlace._id,
        sportPlaceName: sportPlace.name,
      })
    );

    return res.render("admin/sportPlaces", {
      title: "Sport Places",
      hidden: "hidden",
      n: sportPlaces.length,
      sports: sports,
      sportPlaces: sportPlaces,
    });
  })
  .post(async (req, res) => {
    let sportPlaceInfo = req.body;
    if (!sportPlaceInfo || Object.keys(sportPlaceInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(sportPlaceInfo);

    // validation
    try {
      sportPlaceInfo.nameInput = validation.checkTitle(
        sportPlaceInfo.nameInput,
        "Name"
      );
      sportPlaceInfo.sportIDInput = validation.checkId(
        sportPlaceInfo.sportIDInput,
        "sportID"
      );
      sportPlaceInfo.addressInput = validation.checkString(
        sportPlaceInfo.addressInput,
        "Address"
      );
      sportPlaceInfo.descriptionInput = validation.checkString(
        sportPlaceInfo.descriptionInput,
        "Description"
      );
      sportPlaceInfo.capacityInput = validation.checkCapacity(
        sportPlaceInfo.capacityInput,
        "Capacity"
      );
      sportPlaceInfo.priceInput = validation.checkPrice(
        sportPlaceInfo.priceInput,
        "Price"
      );
    } catch (e) {
      const sports = await getSportOptions();

      const sportPlacetList = await sportPlaceData.getAll();
      const sportPlaces = sportPlacetList.map((sportPlace) =>
        Object({
          sportPlaceID: sportPlace._id,
          sportPlaceName: sportPlace.name,
        })
      );

      return res.status(400).render("admin/sportPlaces", {
        title: "Sport Places",
        hidden: "",
        error: e,
        sports: sports,
        sportPlaces: sportPlaces,
        name: sportPlaceInfo.nameInput,
        address: sportPlaceInfo.addressInput,
        description: sportPlaceInfo.descriptionInput,
        capacity: sportPlaceInfo.capacityInput,
        price: sportPlaceInfo.priceInput,
      });
    }

    try {
      const newSportPlace = await sportPlaceData.create(
        sportPlaceInfo.nameInput,
        sportPlaceInfo.sportIDInput,
        sportPlaceInfo.addressInput,
        sportPlaceInfo.descriptionInput,
        sportPlaceInfo.capacityInput,
        sportPlaceInfo.priceInput
      );
      if (!newSportPlace.insertedSportPlace) throw "Internal Server Error";
      return res.redirect("sportPlaces");
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router.route("/events").get(async (req, res) => {
  const eventList = await eventData.getAll();

  let events = [];
  let passedEvents = [];

  if (eventList) {
    eventList.forEach((event) => {
      const eventDate = new Date(`${event.date}:${event.endTime}`);
      if (eventDate < new Date()) {
        passedEvents.push(
          Object({
            eventID: event._id,
            eventName: event.name,
          })
        );
      } else {
        events.push(
          Object({
            eventID: event._id,
            eventName: event.name,
          })
        );
      }
    });
  }

  return res.render("admin/events", {
    title: "Events",
    n: events.length,
    events: events,
    passedEvents: passedEvents,
  });
});

// Remove -> admin/db/remove/:id
router
  .route("/users/remove/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let userInfo = await userData.get(req.params.id);
      return res.render("admin/remove", {
        title: "Remove",
        back: `users/${userInfo._id}`,
        data: userInfo._id,
        db: "users",
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  })
  .delete(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let deleteInfo = await userDataAdmin.remove(req.params.id);
      if (deleteInfo.deleted) {
        return res.redirect("/admin/users");
      }
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/classes/remove/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let classInfo = await classData.get(req.params.id);
      return res.render("admin/remove", {
        title: "Remove",
        back: `classes/${classInfo._id}`,
        data: classInfo._id,
        db: "classes",
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  })
  .delete(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let deleteInfo = await classData.remove(req.params.id);
      if (deleteInfo.deleted) {
        return res.redirect("/admin/classes");
      }
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/sports/remove/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let sportInfo = await sportData.get(req.params.id);
      return res.render("admin/remove", {
        title: "Remove",
        back: `sports/${sportInfo._id}`,
        data: sportInfo._id,
        db: "sports",
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  })
  .delete(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let deleteInfo = await sportData.remove(req.params.id);
      if (deleteInfo.deleted) {
        return res.redirect("/admin/sports");
      }
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/sportPlaces/remove/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let sportPlaceInfo = await sportPlaceData.get(req.params.id);
      return res.render("admin/remove", {
        title: "Remove",
        back: `sportPlaces/${sportPlaceInfo._id}`,
        data: sportPlaceInfo._id,
        db: "sportPlaces",
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  })
  .delete(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let deleteInfo = await sportPlaceData.remove(req.params.id);
      if (deleteInfo.deleted) {
        return res.redirect("/admin/sportPlaces");
      }
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/events/remove/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let eventInfo = await eventData.get(req.params.id);
      return res.render("admin/remove", {
        title: "Remove",
        back: `events/${eventInfo._id}`,
        data: eventInfo._id,
        db: "events",
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  })
  .delete(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let deleteInfo = await eventDataAdmin.remove(req.params.id);
      if (deleteInfo.deleted) {
        return res.redirect("/admin/events");
      }
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

// Info -> admin/db/:id
router.route("/users/:id").get(async (req, res) => {
  try {
    req.params.id = validation.checkId(req.params.id, "ID URL Param");
  } catch (e) {
    return res.status(400).render("admin/error", {
      title: "Error",
      error: e,
    });
  }

  try {
    let userInfo = await userData.get(req.params.id);

    return res.render("admin/userInfo", {
      title: "User Info",
      id: userInfo._id,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      email: userInfo.email,
      gender: userInfo.gender,
      dateOfBirth: userInfo.dateOfBirth,
      contactNumber: userInfo.contactNumber,
    });
  } catch (e) {
    return res.status(404).render("admin/error", {
      title: "Error",
      error: e,
    });
  }
});

router
  .route("/classes/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }

    try {
      let classInfo = await classData.get(req.params.id);
      let sportInfo = {};
      try {
        sportInfo = await sportData.get(classInfo.sportID);
      } catch (e) {
        sportInfo.name = "Please reselect";
      }
      let sportPlaceInfo = {};
      try {
        sportPlaceInfo = await sportPlaceData.get(classInfo.sportPlaceID);
      } catch (e) {
        sportPlaceInfo.name = "Please reselect";
      }
      let instructorInfo = {};
      try {
        instructorInfo = await instructorData.get(classInfo.instructor);
      } catch (e) {
        instructorInfo.name = "Please reselect";
      }

      const userIdList = classInfo.students;
      const users = [];
      if (userIdList) {
        for (let userId of userIdList) {
          const user = await userData.get(userId);
          users.push(
            Object({
              userId: user._id,
              userFirstName: user.firstName,
              userLastName: user.lastName,
            })
          );
        }
      }

      if (!classInfo.rating) classInfo.rating = "NA";

      const sports = await getSportOptions(sportInfo._id);
      const sportPlacetList = await sportPlaceData.getAll();
      let sportPlaces = [];
      if (sportPlacetList) {
        sportPlaces = sportPlacetList.map((sportPlace) =>
          Object({
            sportPlaceID: sportPlace._id,
            name: sportPlace.name,
            sportId1: sportPlace.sportID,
          })
        );
      }
      const instructorList = await instructorData.getall();
      const instructors = instructorList.map((instructor) =>
        Object({
          instructorID: instructor._id,
          instructorName: instructor.name,
          sportId1: instructor.sportID,
        })
      );

      return res.render("admin/classInfo", {
        title: "Class Info",
        hidden: "hidden",
        id: classInfo._id,
        sports: sports,
        sportPlaces: sportPlaces,
        instructors: instructors,
        name: classInfo.title,
        sport: sportInfo.name,
        sportPlace: sportPlaceInfo.name,
        capacity: classInfo.capacity,
        instructor: instructorInfo.name,
        price: classInfo.price,
        date: classInfo.date,
        startTime: classInfo.startTime,
        endTime: classInfo.endTime,
        thumbnail: classInfo.thumbnail,
        rating: classInfo.rating,
        n: classInfo.students.length,
        students: users,
        classTitle: classInfo.title,
        sportID: sportInfo._id,
        sportName: sportInfo.name,
        sportPlaceID: sportPlaceInfo._id,
        sportPlaceName: sportPlaceInfo.name,
        instructorID: instructorInfo._id,
        instructorName: instructorInfo.name,
        newCapacity: classInfo.capacity,
        // newInstructor: classInfo.instructor,
        newPrice: classInfo.price,
        newDate: classInfo.date,
        newStartTime: classInfo.startTime,
        newEndTime: classInfo.endTime,
        newThumbnail: classInfo.thumbnail,
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: `${e}`,
        back: "classes",
      });
    }
  })
  .put(async (req, res) => {
    let classInfo = req.body;
    if (!classInfo || Object.keys(classInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(classInfo);

    // check id
    let classID = req.params.id;
    classID = validation.checkId(classID, "classID");

    // validation
    try {
      classInfo.titleInput = validation.checkTitle(
        classInfo.titleInput,
        "Title"
      );
      classInfo.sportIDInput = validation.checkId(
        classInfo.sportIDInput,
        "SportID"
      );
      classInfo.sportplaceIDInput1 = validation.checkId(
        classInfo.sportplaceIDInput1,
        "Sport PlaceID"
      );
      classInfo.capacityInput = validation.checkCapacity(
        classInfo.capacityInput,
        "Capacity"
      );
      classInfo.instructorInput1 = validation.checkId(
        classInfo.instructorInput1,
        "Instructor"
      );
      classInfo.priceInput = validation.checkPrice(
        classInfo.priceInput,
        "Price"
      );
      classInfo.dateInput = validation.checkDate(classInfo.dateInput, "Date");
      classInfo.startTimeInput = validation.checkTime(
        classInfo.startTimeInput,
        "Start Time"
      );
      classInfo.endTimeInput = validation.checkTime(
        classInfo.endTimeInput,
        "End Time"
      );

      if (classInfo.thumbnailInput)
        classInfo.thumbnailInput = validation.checkURL(
          classInfo.thumbnailInput,
          "Thumbnail"
        );

      validation.checkTimeRange(
        classInfo.startTimeInput,
        classInfo.endTimeInput
      );
    } catch (e) {
      const sports = await getSportOptions();
      const sportPlaces = await getSportPlaceOptions();
      const instructorList = await getSportPlaceOptions();
      const instructors = instructorList.map((instructor) =>
        Object({
          instructorID: instructor._id,
          instructorName: instructor.name,
          sportId1: instructor.sportID,
        })
      );

      let sportInfo = {};
      try {
        sportInfo = await sportData.get(classInfo.sportIDInput);
      } catch (e) {
        sportInfo.name = "Please reselect";
      }
      let sportPlaceInfo = {};
      try {
        sportPlaceInfo = await sportPlaceData.get(classInfo.sportplaceIDInput1);
      } catch (e) {
        sportPlaceInfo.name = "Please reselect";
      }
      let instructorInfo = {};
      try {
        instructorInfo = await instructorData.get(classInfo.instructorInput1);
      } catch (e) {
        instructorInfo.name = "Please reselect";
      }

      let origClassInfo = await classData.get(req.params.id);

      return res.status(400).render("admin/classInfo", {
        title: "Class Info",
        id: origClassInfo._id,
        hidden: "",
        error: e,
        sports: sports,
        sportPlaces: sportPlaces,
        instructors: instructors,
        name: origClassInfo.title,
        sport: origClassInfo.sport,
        sportPlace: origClassInfo.sportPlace,
        capacity: origClassInfo.capacity,
        instructor: origClassInfo.instructor,
        price: classInfo.price,
        date: origClassInfo.date,
        startTime: origClassInfo.startTime,
        endTime: origClassInfo.endTime,
        thumbnail: origClassInfo.thumbnail,
        rating: origClassInfo.rating,
        n: origClassInfo.students.length,
        users: origClassInfo.students,
        classTitle: origClassInfo.title,
        newCapacity: classInfo.capacityInput,
        // newInstructor: classInfo.instructorInput,
        newPrice: classInfo.priceInput,
        newDate: classInfo.dateInput,
        newStartTime: classInfo.startTimeInput,
        newEndTime: classInfo.endTimeInput,
        newThumbnail: classInfo.thumbnailInput,
        sportID: sportInfo._id,
        sportName: sportInfo.name,
        sportPlaceID: sportPlaceInfo._id,
        sportPlaceName: sportPlaceInfo.name,
        instructorID: instructorInfo._id,
        instructorName: instructorInfo.name,
      });
    }

    // update
    try {
      const newClass = await classData.update(
        classID,
        classInfo.titleInput,
        classInfo.sportIDInput,
        classInfo.sportplaceIDInput1,
        classInfo.capacityInput,
        classInfo.instructorInput1,
        classInfo.priceInput,
        classInfo.dateInput,
        classInfo.startTimeInput,
        classInfo.endTimeInput,
        classInfo.thumbnailInput
      );
      if (!newClass.updatedClass) throw "Internal Server Error";
      return res.redirect(`${classID}`);
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/sports/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let sport = await sportData.get(req.params.id);
      return res.render("admin/sportInfo", {
        title: "Sport Info",
        hidden: "hidden",
        id: sport._id,
        name: sport.name,
        thumbnail: sport.thumbnail,
        newName: sport.name,
        newThumbnail: sport.thumbnail,
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: `${e}`,
        back: "sports",
      });
    }
  })
  .put(async (req, res) => {
    let sportInfo = req.body;
    if (!sportInfo || Object.keys(sportInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(sportInfo);

    // check id
    let sportID = req.params.id;
    sportID = validation.checkId(sportID, "sportID");

    // validation
    try {
      sportInfo.nameInput = validation.checkTitle(sportInfo.nameInput, "Name");

      if (sportInfo.thumbnailInput)
        sportInfo.thumbnailInput = validation.checkURL(
          sportInfo.thumbnailInput,
          "Thumbnail"
        );
    } catch (e) {
      let origSport = await sportData.get(req.params.id);

      return res.status(400).render("admin/sportInfo", {
        title: "Sport Info",
        hidden: "",
        error: e,
        id: origSport._id,
        name: origSport.name,
        thumbnail: origSport.thumbnail,
        newName: sportInfo.nameInput,
        newThumbnail: sportInfo.thumbnailInput,
      });
    }

    // update
    try {
      const newSport = await sportData.update(
        sportID,
        sportInfo.nameInput,
        sportInfo.thumbnailInput
      );
      if (!newSport.updatedSport) throw "Internal Server Error";
      return res.redirect(`${sportID}`);
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/sportPlaces/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let sportPlace = await sportPlaceData.get(req.params.id);
      let sportInfo = {};
      try {
        sportInfo = await sportData.get(sportPlace.sportID);
      } catch (e) {
        sportInfo.name = "Please reselect";
      }

      const userIdList = sportPlace.users;
      const users = [];
      if (userIdList) {
        for (let userId of userIdList) {
          const user = await userData.get(userId);
          users.push(
            Object({
              userId: user._id,
              userFirstName: user.firstName,
              userLastName: user.lastName,
            })
          );
        }
      }

      const sports = await getSportOptions(sportInfo._id);
      return res.render("admin/sportPlaceInfo", {
        title: "SportPlace Info",
        hidden: "hidden",
        id: sportPlace._id,
        sports: sports,
        name: sportPlace.name,
        sport: sportInfo.name,
        address: sportPlace.address,
        description: sportPlace.description,
        capacity: sportPlace.capacity,
        price: sportPlace.price,
        thumbnail: sportPlace.thumbnail,
        rating: sportPlace.rating,
        n: sportPlace.users.length,
        users: users,
        sportID: sportInfo._id,
        sportName: sportInfo.name,
        newName: sportPlace.name,
        newAddress: sportPlace.address,
        newDescription: sportPlace.description,
        newCapacity: sportPlace.capacity,
        newPrice: sportPlace.price,
        newThumbnail: sportPlace.thumbnail,
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: `${e}`,
        back: "sportPlaces",
      });
    }
  })
  .put(async (req, res) => {
    let sportPlaceInfo = req.body;
    if (!sportPlaceInfo || Object.keys(sportPlaceInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(sportPlaceInfo);

    // check id
    let sportPlaceID = req.params.id;
    sportPlaceID = validation.checkId(sportPlaceID, "sportPlaceID");

    // validation
    try {
      sportPlaceInfo.nameInput = validation.checkTitle(
        sportPlaceInfo.nameInput,
        "Name"
      );
      sportPlaceInfo.sportIDInput = validation.checkId(
        sportPlaceInfo.sportIDInput,
        "SportID"
      );
      sportPlaceInfo.addressInput = validation.checkString(
        sportPlaceInfo.addressInput,
        "Address"
      );
      sportPlaceInfo.descriptionInput = validation.checkString(
        sportPlaceInfo.descriptionInput,
        "Description"
      );
      sportPlaceInfo.capacityInput = validation.checkCapacity(
        sportPlaceInfo.capacityInput,
        "Capacity"
      );
      sportPlaceInfo.priceInput = validation.checkPrice(
        sportPlaceInfo.priceInput,
        "Price"
      );

      if (sportPlaceInfo.thumbnailInput)
        sportPlaceInfo.thumbnailInput = validation.checkURL(
          sportPlaceInfo.thumbnailInput,
          "Thumbnail"
        );
    } catch (e) {
      const sports = await getSportOptions();

      let origSportPlace = await sportPlaceData.get(req.params.id);

      return res.render("admin/sportPlaceInfo", {
        title: "SportPlace Info",
        hidden: "",
        error: e,
        id: origSportPlace._id,
        sports: sports,
        name: origSportPlace.name,
        sport: origSportPlace.sport,
        address: origSportPlace.address,
        description: origSportPlace.description,
        capacity: origSportPlace.capacity,
        price: origSportPlace.price,
        thumbnail: origSportPlace.thumbnail,
        rating: origSportPlace.rating,
        n: origSportPlace.users.length,
        users: origSportPlace.users,
        newName: sportPlaceInfo.nameInput,
        newAddress: sportPlaceInfo.addressInput,
        newDescription: sportPlaceInfo.descriptionInput,
        newCapacity: sportPlaceInfo.capacityInput,
        newPrice: sportPlaceInfo.priceInput,
        newThumbnail: sportPlaceInfo.thumbnailInput,
      });
    }

    // update
    try {
      const newSportPlace = await sportPlaceData.update(
        sportPlaceID,
        sportPlaceInfo.nameInput,
        sportPlaceInfo.sportIDInput,
        sportPlaceInfo.addressInput,
        sportPlaceInfo.descriptionInput,
        sportPlaceInfo.capacityInput,
        sportPlaceInfo.priceInput,
        sportPlaceInfo.thumbnailInput
      );
      if (!newSportPlace.updatedSportPlace) throw "Internal Server Error";
      return res.redirect(`${sportPlaceID}`);
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router.route("/events/:id").get(async (req, res) => {
  try {
    req.params.id = validation.checkId(req.params.id, "ID URL Param");
  } catch (e) {
    return res.status(400).render("admin/error", {
      title: "Error",
      error: e,
    });
  }
  try {
    let event = await eventData.get(req.params.id);

    const userIdList = event.participants;
    const users = [];
    if (userIdList) {
      for (let userId of userIdList) {
        const user = await userData.get(userId);
        users.push(
          Object({
            userId: user._id,
            userFirstName: user.firstName,
            userLastName: user.lastName,
          })
        );
      }
    }

    const holderInfo = await userData.get(event.userID);

    return res.render("admin/eventInfo", {
      title: "Event Info",
      id: event._id,
      name: event.name,
      userID: holderInfo.firstName,
      description: event.description,
      sport: event.sport,
      sportPlace: event.sportPlace,
      capacity: event.capacity,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      n: event.participants.length,
      participants: users,
      thumbnail: event.image,
    });
  } catch (e) {
    return res.status(404).render("admin/error", {
      title: "Error",
      error: `${e}`,
      back: "events",
    });
  }
});

router.route("/logout").get(async (req, res) => {
  req.session.destroy();
  return res.render("admin/logout", { title: "Logout" });
});

router
  .route("/timeSlot")
  .get(async (req, res) => {
    const sports = await getSportOptions();

    const sportPlacetList = await sportPlaceData.getAll();
    const sportPlaces = sportPlacetList.map((sportPlace) =>
      Object({
        sportPlaceID: sportPlace._id,
        sportPlaceName: sportPlace.name,
        sportId1: sportPlace.sportID,
      })
    );

    return res.render("admin/timeSlot", {
      title: "Add TimeSlots",
      hidden: "hidden",
      sports: sports,
      sportPlaces: sportPlaces,
      sportsearchs: sports,
      sportPlacessearches: sportPlaces,
    });
  })
  .post(async (req, res) => {
    let timeSlotInfo = req.body;
    if (!timeSlotInfo || Object.keys(timeSlotInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }
    applyXSS(timeSlotInfo);
    // validation
    try {
      timeSlotInfo.sportIDInput = validation.checkId(
        timeSlotInfo.sportIDInput,
        "sportID"
      );
      timeSlotInfo.sportplaceIDInput1 = validation.checkId(
        timeSlotInfo.sportplaceIDInput1,
        "sportPlaceID"
      );
      timeSlotInfo.dateInput = validation.checkString(
        timeSlotInfo.dateInput,
        "date"
      );
      timeSlotInfo.slotInput = validation.checkNumber(
        timeSlotInfo.slotInput,
        "slotID"
      );
    } catch (e) {
      // const sports = await getSportOptions(timeSlotInfo.sportIDInput);
      // const sportPlacetList = await sportPlaceData.getAll();
      // const sportPlaces = sportPlacetList.map((sportPlace) =>
      //   Object({
      //     sportPlaceID: sportPlace._id,
      //     sportPlaceName: sportPlace.name,
      //   })
      // );

      // return res.status(400).render("admin/timeSlot", {
      //   title: "Add TimeSlots",
      //   hidden: "",
      //   error: e,
      //   sports: sports,
      //   sportPlaces: sportPlaces,
      //   name: timeSlotInfo.sportIDInput,
      //   address: timeSlotInfo.sportplaceIDInput,
      //   description: timeSlotInfo.dateInput,
      //   capacity: timeSlotInfo.slotInput,

      // });
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }

    try {
      const newSlot = await slotData.create(
        timeSlotInfo.sportIDInput,
        timeSlotInfo.sportplaceIDInput1,
        timeSlotInfo.dateInput,
        timeSlotInfo.slotInput
      );
      if (!newSlot.insertedtimeSlot) throw "Internal Server Error";
      return res.redirect("timeSlot");
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router.route("/allVenue").get(async (req, res) => {
  try {
    let venueList = await slotData.getallvenue();

    let pData = [];
    let lData = [];

    for (let i = 0; i < venueList.length; i++) {
      if (venueList[i].Date >= new Date().toISOString().split("T")[0]) {
        lData.push(venueList[i]);
      } else {
        pData.push(venueList[i]);
      }
    }

    let empty = lData.length == 0 ? true : false;
    let emptyold = pData.length == 0 ? true : false;

    return res.render("admin/allVenue", {
      title: "All Reserved Venue",
      venueList: lData,
      venuelistold: pData,
      hidden: "hidden",
      isempty: empty,
      isemptyold: emptyold,
    });
  } catch (e) {
    return res.status(400).render("admin/error", {
      title: "Error",
      error: e,
    });
  }
});

router.route("/searchSlot").post(async (req, res) => {
  let timeSlotInfo = req.body;
  if (!timeSlotInfo || Object.keys(timeSlotInfo).length === 0) {
    return res.status(400).render("admin/error", {
      title: "Error",
      error: "There are no fields in the request body",
    });
  }

  applyXSS(timeSlotInfo);
  // validation
  try {
    timeSlotInfo.sportIDInputS = validation.checkId(
      timeSlotInfo.sportIDInputS,
      "sportID"
    );
    timeSlotInfo.sportplaceIDInput1s = validation.checkId(
      timeSlotInfo.sportplaceIDInput1s,
      "sportPlaceID"
    );
    timeSlotInfo.dateInputs = validation.checkString(
      timeSlotInfo.dateInputs,
      "date"
    );
  } catch (e) {
    // const sports = await getSportOptions(timeSlotInfo.sportIDInput);
    // const sportPlacetList = await sportPlaceData.getAll();
    // const sportPlaces = sportPlacetList.map((sportPlace) =>
    //   Object({
    //     sportPlaceID: sportPlace._id,
    //     sportPlaceName: sportPlace.name,
    //   })
    // );

    // return res.status(400).render("admin/timeSlot", {
    //   title: "Add TimeSlots",
    //   hidden: "",
    //   error: e,
    //   sports: sports,
    //   sportPlaces: sportPlaces,
    //   name: timeSlotInfo.sportIDInput,
    //   address: timeSlotInfo.sportplaceIDInput,
    //   description: timeSlotInfo.dateInput,
    //   capacity: timeSlotInfo.slotInput,

    // });
    return res.status(500).render("admin/error", {
      title: "Error",
      error: e,
    });
  }

  try {
    const sportssearch = await getSportOptions();
    const sportPlacetListsearch = await sportPlaceData.getAll();
    const sportPlacesSearch = sportPlacetListsearch.map((sportPlace) =>
      Object({
        sportPlaceID: sportPlace._id,
        sportPlaceName: sportPlace.name,
        sportId1: sportPlace.sportID,
      })
    );
    let slotList = await slotUserData.getslotsByDateSerach(
      timeSlotInfo.sportIDInputS,
      timeSlotInfo.sportplaceIDInput1s,
      timeSlotInfo.dateInputs
    );

    let empty = slotList.length == 0 ? true : false;

    return res.render("admin/timeSlot", {
      title: "All TimeSlot",
      sportsearchs: sportssearch,
      sportPlacessearches: sportPlacesSearch,
      venueListsearch: slotList,
      hidden: "hidden",
      isempty1: empty,
      sports: sportssearch,
      sportPlaces: sportPlacesSearch,
      // datesearch: timeSlotInfo.dateInput,
    });
  } catch (e) {
    return res.status(400).render("admin/error", {
      title: "Error",
      error: e,
    });
  }
});

router
  .route("/instructor")
  .get(async (req, res) => {
    const sports = await getSportOptions();
    const instructorList = await instructorData.getall();

    return res.render("admin/instructor", {
      title: "Instructor",
      hidden: "hidden",
      n: instructorList.length,
      sports: sports,
      instructor: instructorList,
    });
  })
  .post(async (req, res) => {
    let instructorInfo = req.body;
    if (!instructorInfo || Object.keys(instructorInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }
    applyXSS(instructorInfo);
    // validation
    try {
      instructorInfo.sportIDInput = validation.checkId(
        instructorInfo.sportIDInput,
        "sport"
      );
      instructorInfo.nameInput = validation.checkString(
        instructorInfo.nameInput,
        "Name"
      );
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      const newdata = await instructorData.create(
        instructorInfo.sportIDInput,
        instructorInfo.nameInput
      );
      if (!newdata.insertedInstructor) throw "Internal Server Error";
      return res.redirect("instructor");
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/instructor/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let selectedinstructor = await instructorData.get(req.params.id);
      let sportInfo = {};
      try {
        sportInfo = await sportData.get(selectedinstructor.sportID);
      } catch (e) {
        sportInfo.name = "Please reselect";
      }

      const sports = await getSportOptions(sportInfo._id);
      return res.render("admin/instructorInfo", {
        title: "Instructor Info",
        hidden: "hidden",
        id: selectedinstructor._id,
        sports: sports,
        name: selectedinstructor.name,
        sport: sportInfo.name,
        sportID: sportInfo._id,
        sportName: sportInfo.name,
        newName: selectedinstructor.name,
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: `${e}`,
        back: "instructor",
      });
    }
  })
  .put(async (req, res) => {
    let instructorInfo = req.body;
    if (!instructorInfo || Object.keys(instructorInfo).length === 0) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: "There are no fields in the request body",
      });
    }

    // XSS
    applyXSS(instructorInfo);

    // check id
    let instructorid = req.params.id;
    instructorid = validation.checkId(instructorid, "instructor");

    // validation
    try {
      instructorInfo.nameInput = validation.checkTitle(
        instructorInfo.nameInput,
        "Name"
      );
      instructorInfo.sportIDInput = validation.checkId(
        instructorInfo.sportIDInput,
        "SportID"
      );
    } catch (e) {
      const sports = await getSportOptions();

      let originstructor = await instructorData.get(req.params.id);

      return res.render("admin/instructorInfo", {
        title: "instructor Info",
        hidden: "",
        error: e,
        id: originstructor._id,
        sports: sports,
        name: originstructor.name,
        sport: originstructor.sport,
        newName: instructorInfo.nameInput,
      });
    }

    // update
    try {
      const newInsertInformation = await instructorData.update(
        instructorid,
        instructorInfo.nameInput,
        instructorInfo.sportIDInput
      );
      if (!newInsertInformation.updatedInstructor)
        throw "Internal Server Error";
      return res.redirect(`${instructorid}`);
    } catch (e) {
      return res.status(500).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

router
  .route("/instructor/remove/:id")
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let instructoreInfo = await instructorData.get(req.params.id);
      return res.render("admin/remove", {
        title: "Remove",
        back: `instructor/${instructoreInfo._id}`,
        data: instructoreInfo._id,
        db: "instructor",
      });
    } catch (e) {
      return res.status(404).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  })
  .delete(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id, "ID URL Param");
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
    try {
      let deleteInfo = await instructorData.remove(req.params.id);
      if (deleteInfo.deleted) {
        return res.redirect("/admin/instructor");
      }
    } catch (e) {
      return res.status(400).render("admin/error", {
        title: "Error",
        error: e,
      });
    }
  });

// all other admin urls
router.route("*").get(async (req, res) => {
  return res.status(404).render("admin/error", {
    title: "Error",
    error: `Error: "/admin${req.url}" is not a valid url`,
    back: "profile",
  });
});

export default router;
