const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');

const flash = require('connect-flash');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const path = require('path');

const passport = require('passport');
const partials = require('express-partials');
const fs = require('fs');
const postRoutes = require('./routes/posts');
const Posts = require('./models/posts');
const Comments = require('./models/comments');
const Events = require('./models/events');
const Likes = require('./models/likes');

const User = require('./models/user');
const mongoDb = require('./config/db');
const userRoutes = require('./routes/user');
const indexPageRoutes = require('./routes/index');
const commentRoutes = require('./routes/comments');
const eventRoutes = require('./routes/events');
const likeRoutes = require('./routes/likes');
const dislikeRoutes = require('./routes/dislikes');
const viewRoutes = require('./routes/views');

// Passport Config
require('./config/passport-config')(passport);

const { ensureAuthenticated, ensureIsAdmin } = require('./config/auth');
const Dislikes = require('./models/dislikes');

const server = express();

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const myCss = fs.readFileSync('./views/partials/css/style.css', 'utf8');

// EJS
app.set('view engine', 'ejs');
app.use(partials());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(methodOverride());

// app.use(express.static('public'));

app.use(express.static(path.join(__dirname, 'public')));

mongoDb();
const store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/forum',
  collection: 'mySessions',
});

// Express session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
    store: store,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});
app.use(function (req, res, next) {
  res.locals.user = req.user;
  next();
});

app.use('/', userRoutes);
app.use('/', indexPageRoutes);
app.use('/post', postRoutes);
app.use('/comment', commentRoutes);
app.use('/event', eventRoutes);
app.use('/like', likeRoutes);
app.use('/dislike', dislikeRoutes);
app.use('/view', viewRoutes);

app.get('/', async (req, res) => {
  // fetch all the posts
  const posts = await Posts.find().sort({ createdAt: 'desc' });

  const comments = await Comments.find().sort({ createdAt: 'desc' });

  // Dont show expired events on the home page use dateAndTime
  const events = await Events.find({ dateAndTime: { $gte: new Date() } }).sort({
    dateAndTime: 'asc',
  });

  // const events = await Events.find().sort({ createdAt: 'desc' });

  // Likes of particular post
  const likes = await Likes.find().sort({ createdAt: 'desc' });
  const dislikes = await Dislikes.find().sort({ createdAt: 'desc' });

  // console.log(comments);
  res.render('index', {
    posts,
    comments,
    events,
    likes,
    dislikes,
    myCss: myCss,
  });
});

// Logout routes
app.get('/logout', (req, res) => {
  req.logOut();
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
