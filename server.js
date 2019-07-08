const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cryptoRandomString = require("crypto-random-string")

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
  _id: {type: String, required: true, maxlength: 9},
  username: String
})

//user model
let User = mongoose.model("User", userSchema);

//route to post new user
app.post("/api/exercise/new-user", function (req, res) {
  let newUser = new User({"_id": uniqueUserID, "username": req.body.username});
  let uniqueUserID = cryptoRandomString({length: 4 }) + "-" + cryptoRandomString({length: 4});
  console.log("Post req.body.username " + req.body.username);
  
  /*
  //newUser.save saves the newUser to mongoDB, and returns and error or a JSON of the saved
  user with the _id
  TO DO: shorted _id so it can be used as a userID
    check if username already exists and return error if so. Use unique and index on schema type? return error from unique?
  */
  newUser.save(function(err, user){
    if(err){
      console.error(err);
      if(err.code === 110000){
        return res.json({
          "Error": "Diplicate Username", 
          "errMessage": "This username is already taken.  Please chooose another name."
      });
      }else {
        return res.json({"Error": "Username error", "errMessage": err});
      }
    }else {
      return res.json({"username": user.username, "_id": user._id});
    }
  })
});


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



