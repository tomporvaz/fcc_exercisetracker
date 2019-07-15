const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cryptoRandomString = require("crypto-random-string")
const uniqueValidator = require('mongoose-unique-validator')

const cors = require('cors')

const mongoose = require('mongoose')
const Schema = mongoose.Schema;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//code here for creating a new user including schema, model and route
//to be broken out into its module after code is working.

//user schema
let userSchema = new Schema({
  _id: {type: String, required: true, maxlength: 9, unique: true},
  username: {type: String, required: true, unique: true}
})
userSchema.plugin(uniqueValidator);

//user model
let User = mongoose.model("User", userSchema);

//route to post new user
app.post("/api/exercise/new-user", function (req, res) {
  let uniqueUserID = cryptoRandomString({length: 4 }) + "-" + cryptoRandomString({length: 4});
  let newUser = new User({"_id": uniqueUserID, "username": req.body.username});
  
  console.log("Post req.body.username " + req.body.username);
  
  /*
  newUser.save saves the newUser to mongoDB, and returns and error or a JSON of the saved
  user with the _id
  */
  newUser.save(function(err, user){
    if(err){
      console.error(err);
      if(err.name === "ValidationError"){
        return res.send(err.message);
      }else {
        return res.json({"Error": "Username error", "errMessage": err});
      }
    }else {
      return res.json({"username": user.username, "_id": user._id});
    }
  })
});

/*
Route to return array of users
*/
app.get("/api/exercise/users", function(req, res){
  User.find({}, function(err, userArray){
    if(err){
      console.error(err);
      return res.json({"error": "Could not find users"})
    } else {
      return res.json(userArray);
    }
  })
})


/*
This route here wiil save excercise workout info
*/
const workoutSchema = new Schema({
  userID: {type: String, ref: User},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: String}
})

let Workout = mongoose.model("Workout", workoutSchema);

//route
app.post("/api/exercise/add", function (req, res){
  console.log(".../add req.body" + JSON.stringify(req.body));
  
  //define date here with req.body.date or todays date if empty
  const workoutDate = req.body.date ? new Date (req.body.date) : new Date();
  
  //create new Workout with req data, and save Workout to MongoDB
  let newWorkout = new Workout ({
    userID: "",
    description: req.body.description,
    duration: req.body.duration,
    date: workoutDate
  }); 
  
  //check if user exists in user collection before assigning to newWorkout
  //I believe this query could be avoided with pre("save") hook
  User.findById(req.body.userId,
    function(err, user){
      if(!user){
        return res.send("User with id " + req.body.userId + " does not exist!");
      } else  if(err){{
        console.error(err);
        return res.send("Error on username: " + err);
      }
    } else {
      newWorkout.userID = req.body.userId;
      newWorkout.save()
      .then(savedWorkout => Workout.findById(savedWorkout._id)   //filter and use callback to respond
      .populate("userID")
      .exec((err, populatedWorkout) => {
        if(err){
          console.error(err);
          res.json({"Error": "Error in findOneByID query chain"});
        } else {
          res.json({
            username: populatedWorkout.userID.username,
            description: populatedWorkout.description,
            duration: populatedWorkout.duration,
            userID: populatedWorkout.userID._id,
            date: populatedWorkout.date
          });
        }
      }))
      .catch(function(err){   //handle errors for promise chain
        //handle error
        console.error(err);
        res.json({Error: "Error adding new excercise."});
      });
    }
  });    
})

/*
Route to return user workout log
*/
app.get("/api/exercise/log", function(req, res){
  const fromDate = Date(req.query.from);
  const toDate = Date(req.query.to);

  User.findById(req.query.userId, function(err, user){
    if(err){
      console.error(err);
      return res.json({"error": "Could not find users"})
    } else {
      Workout.find({
        userID: user._id,
        date: {$gte: fromDate, $lte: toDate}
      })
      .limit(Number(req.query.limit))  //limit needs to be cast to a string.  Thx Flaviocopes
      .exec(function(err, workouts){
        console.error(err); //one little change to test commit
        console.log(req.query);
        let workoutLogObject = {
          userObj: user,
          count: workouts.length,
          log: workouts
        }
        return res.json(workoutLogObject);
      })
    }
  })
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage
  
  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
  .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})



