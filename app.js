//installing and using all the modules
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

//telling my app to use sessions which i have declared above using its documentation
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false,
}));


//telling my app to use and initialize passport
app.use(passport.initialize());
//using passport to deal with sessions
app.use(passport.session());

//connecting to my mongo atlas database
mongoose.connect("mongodb+srv://admin-vaibhav:Test123@cluster0.ljae4ay.mongodb.net/userDB");

//setting new user schema for mongoose to use
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

//using passport local mongoose
//and to use it we;ve to add it to the mongoose model as a plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//creating mongoose model
const User = mongoose.model("User",userSchema);

//passportLocalMongoose configuration
passport.use(User.createStrategy());

//makes the cookie containing identity of the user
passport.serializeUser(function(user,done){
  done(null,user.id);
});
//breaks the cookie revaling identity
passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
    done(err,user);
  });
});



//adding new google authentication code done according to google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://corptalks-feedback-vaibhav.onrender.com/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//Get requests which make all the pages visible to us


//FETCHING HOME PAGE
app.get("/",function(req,res){
  res.render("home");
});

//setting up the button copied from google
app.get("/auth/google",
  passport.authenticate("google",{ scope: ["profile"]})
);


app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


//FETCHING LOGIN PAGE
app.get("/login",function(req,res){
  res.render("login");
});

app.get("/secrets",function(req,res){
User.find({"secret":{$ne: null}}, function(err,foundUsers){
  if(err){
    console.log(err);
  }else{
    res.render("secrets",{usersWithSecrets: foundUsers})
  }
})


});

//FETCHING SUBMIT
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.render("/login");
  }
});


app.post("/submit",function(req,res){
  const submittedSecret =  req.body.secret;
  //passports saves users detail in req during the SESSION so
User.findById(req.user.id,function(err,foundUser){
  if(err){
    console.log(err);
  }else{
    if(foundUser){
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  }
});
});

//FETCHING REGISTER PAGE
app.get("/register",function(req,res){
  res.render("register");
});

//usingg passport js to logout
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});


//FETCHING INFO FROM REGISTER
app.post("/register",function(req,res){

//TAPPING INTO USER MODEL AND CALLING REGISTER WHICH COMES FROM PASSPORTLOCALMONGOOSE
//BEACUSE OF THIS PACKAGE WE CAN PREVENT CREATING NEW USER AND INTERACTING WTH MONGOOSE DIRECTLY
User.register({username: req.body.username}, req.body.password,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }else{
    //if no error found then we authenticate the user
    //local is the type of authenitcation that we are using
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
  });

//FETCHING INFO FROM LOGIN
app.post("/login",function(req,res){

const user = new User({
  username: req.body.username,
  password: req.body.password
});
//using passport to login and authenticate
req.login(user, function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
  });
}
});
});






let port = process.env.PORT;
if (port == null || port == ""){
  port = 3000;
}
app.listen(port,function(){
  console.log("server started");
});
