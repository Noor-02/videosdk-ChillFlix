//jshint esversion:6
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import mongoose from "mongoose";
import session from 'express-session';
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import GoogleStrategy from 'passport-google-oauth20';
GoogleStrategy.Strategy
import findOrCreate from 'mongoose-findorcreate';
import jwt from "jsonwebtoken";
import cors from "cors";
import request from "node-fetch";

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our liitle secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true });
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    googleId: String,
    username: String,
    picture: String,
    fname: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
var currentid = "";

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3003/auth/google/chillflix",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        currentid = profile.id;

        User.findOrCreate({ username: profile.emails[0].value, googleId: profile.id, picture: profile.photos[0].value, fname: profile.displayName }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/get-token", (req, res) => {
  const API_KEY = process.env.ZUJONOW_API_KEY;
  const SECRET_KEY = process.env.ZUJONOW_SECRET_KEY;
  const options = { expiresIn: "10m", algorithm: "HS256" };
  const payload = {
    apikey: API_KEY,
  };
  const token = jwt.sign(payload, SECRET_KEY, options);
  console.log(token);
  req.session.token=token;
  res.json({ token });
});


  app.route("/")
    .get((req, res) => {
         res.render('home');
    });


app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', "email"] }));

app.get("/auth/google/chillflix",
    passport.authenticate('google', { failureRedirect: "/" }),
    function (req, res) {
        res.redirect("/main");
    });


app.route("/main")
.get((req, res) => {
  const API_KEY = process.env.ZUJONOW_API_KEY;
  const SECRET_KEY = process.env.ZUJONOW_SECRET_KEY;
  const option = { expiresIn: "10m", algorithm: "HS256" };
  const payload = {
    apikey: API_KEY,
  };
  let token = jwt.sign(payload, SECRET_KEY, option);

  console.log(token);

  const url = "https://api.zujonow.com/v1/meetings";

  var options = {
    method: "POST",
    headers: {
      Authorization: `${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  
  request(url, options)
    .then((res) => res.json())
    .then((json) => console.log(json))
    .catch((err) => console.error("error:" + err));
  
  res.render('main')
});




app.listen(3003, () => {
    console.log('CONNECTION ESTABLISHED ON PORT 3003')
});