import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import session from "express-session";
import flash from "express-flash";
import passport from "passport";
// import {initializeStudent} from "./passportConfig.js"
// import { initializeORG } from "./passportConfig1.js";
import initializePassport from "./passportConfig.js"
import db from "./dbConfig.js";
import gravatar from "gravatar";
// import './auth.js';
import dotenv from 'dotenv';
import path from 'path';
// import { connection } from "./dbQueries.js";
import fetch from "node-fetch";
import "dotenv/config";
import paypal from 'paypal-rest-sdk';
import {payment_route as paymentRoute }from './routes/paymentRoute.js';

dotenv.config();  

const PORT = 4000;
const app = express();

// app.use(express.static("public"));
app.use(express.static("views"));
app.use(express.static("loginAssets"));
// app.use(express.static("assets"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // secure should be true in production
  }));

initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use('/',paymentRoute);
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// app.use(express.static(path.join(__dirname, "./views")));
// app.use(express.static(path.join(__dirname, "./public")));
paypal.configure({
    'mode': 'live', //sandbox or live
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
  });

  var create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://return.url",
        "cancel_url": "http://cancel.url"
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": "item",
                "sku": "item",
                "price": "1.00",
                "currency": "EUR",
                "quantity": 1
            }]
        },
        "amount": {
            "currency": "EUR",
            "total": "1.00"
        },
        "description": "This is the payment description."
    }]
};

paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
        throw error;
    } else {
        console.log("Create Payment Response");
        console.log(payment);
    }
});


const my_email = process.env.MY_EMAIL;
const my_pass = process.env.MY_PASS;

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: my_email,
        pass: my_pass
    }
});
function sendMail(name, Semail, phone, message, event, location) {
    return new Promise((resolve, reject) => {
      const mailOptions = {
        from: Semail,
        to: my_email,
        subject: 'Message from ' + name + " " + Semail,
        text:  "Interested in =>\n Event => " + event + " at " + location + "\n Note => " + message + "\n Phone number => " + phone
      };
  
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
          reject(false);
        } else {
          console.log('Email sent: ' + info.response);
          resolve(true);
        }
      });
    });
}

app.post("/contact", async (req, res) => {
    const name = req.body.name;
    const Semail = req.body.email;
    const phone = req.body.phone;
    const message = req.body.message;
    const event = req.body.event;
    const location = req.body.location;

    try {
        // Send email and get the result
        const emailSent = await sendMail(name, Semail, phone, message, event, location);
    
        // Respond to the client based on the result
        res.render("contact.ejs", {message: "Sent!", user: req.user});
      } catch (error) {
        // Handle any unexpected errors
        console.error(error);
        res.render("contact.ejs", {message: "Error", user: req.user});
      }  
});


app.get("/", async (req, res) => {

    let result = await db.query(`SELECT * FROM blogposts`);
    let author = await db.query('SELECT * FROM users WHERE id = $1', [1]);
    res.render("index.ejs", {posts: result.rows, author: author.rows[0], user: req.user});
})

app.get("/about", (req, res) => {
    res.render("about.ejs", {user: req.user});
})

// app.get("/blog-single", (req, res) => {
//     res.render("blog-single.ejs");
// })


app.get("/contact", (req, res) => {
    res.render("contact.ejs", {user: req.user});
})

// app.get("/menu", (req, res) => {
//     res.render("menu.ejs");
// })

app.get("/reservation", (req, res) => {
    res.render("reservation.ejs", {user: req.user});
})

app.get("/createBlog", isAdmin, (req, res) => {
    res.render("createBlog.ejs", {user: req.user});
})

app.get("/login", checkAuthenticated, async (req, res) => {
    // let latestPosts = await db.query('SELECT * FROM blogposts ORDER BY id DESC LIMIT 8;');
    res.render("login.ejs");
});

app.get("/register", checkAuthenticated, async (req, res) => {
    // let latestPosts = await db.query('SELECT * FROM blogposts ORDER BY id DESC LIMIT 8;');
    res.render("registration.ejs", {user: req.user});
});

app.get("/cookingClasses", async (req, res) => {
    let result = await db.query(`SELECT * FROM blogposts where type= $1`, ['cookingclasses']);
    let author = await db.query('SELECT * FROM users WHERE id = $1', [1]);
    res.render("blog.ejs", {heading: "Cooking Classes", posts: result.rows, author: "Debora", user: req.user, image: "imagesOriginal/co.jpg"});
})

app.get("/personalChefs", async (req, res) => {
    let result = await db.query(`SELECT * FROM blogposts where type= $1`, ['chefs']);
    let author = await db.query('SELECT * FROM users WHERE id = $1', [1]);
    res.render("blog.ejs", {heading: "Personal Chefs", posts: result.rows, author: "Debora", user: req.user, image: "imagesOriginal/PAG_32.jpg"});
})

app.get("/cookingTeamBuilding", async (req, res) => {
    let result = await db.query(`SELECT * FROM blogposts where type= $1`, ['teambuilding']);
    let author = await db.query('SELECT * FROM users WHERE id = $1', [1]);
    res.render("blog.ejs", {heading: "Cooking Team Building", posts: result.rows, author: "Debora", user: req.user, image: "imagesOriginal/teamBui.jpg"});
})

app.get("/recipes", async (req, res) => {
    let result = await db.query(`SELECT * FROM blogposts where type= $1`, ['recipes']);
    let author = await db.query('SELECT * FROM users WHERE id = $1', [1]);
    res.render("blog.ejs", {heading: "Recipes", posts: result.rows, author: "Debora", user: req.user, image: "images/bg_3.jpg"});
})

app.get("/see-post", async (req, res) => {
    let postResult = await db.query('SELECT * FROM blogposts WHERE id = $1', [req.query.id]);
    let author = await db.query('SELECT * FROM users WHERE id = $1', [postResult.rows[0].author_id]);
    try{
        const commentsResult = await db.query('SELECT * FROM comments WHERE post_id = $1', [req.query.id]);
        res.render("blog-single.ejs", {post: postResult.rows[0], comments:  commentsResult.rows, user: req.user, author: author});
    }catch(error){
        res.render("blog-single.ejs", {post: postResult.rows[0], user: req.user, author: author});
    }
});

app.get("/terms", async (req, res) => {
    res.render("terms.ejs",{user: req.user});
});

app.post("/add-comment", checkNotAuthenticated, async (req, res) => {
    //Date calculation.
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yy = String(today.getFullYear()).slice(-2);
    const formattedDate = dd + '-' + mm + '-' + yy;
    let result = await db.query('INSERT INTO comments (content, post_id, date, name, grav_url) VALUES ($1, $2, $3, $4, $5)', [req.body.content_body, req.query.id, formattedDate, req.user.name, req.user.grav_url]);
    res.redirect('back');
})

app.get("/delete", isAdmin, async (req, res) => {
    let result = await db.query('DELETE FROM blogposts WHERE id = $1', [req.query.id]);
    res.redirect('/');
})

app.get("/edit", isAdmin,  async (req, res) => {
    console.log(req.query.id);
    let result = await db.query('SELECT * FROM blogposts WHERE id = $1', [req.query.id]);
    res.render("editBlog.ejs", {user: req.user, post: result.rows[0]});
})

app.post("/edit", isAdmin, async (req, res) => {
    let result = await db.query('UPDATE blogposts SET title = $1, subtitle = $2, body = $3, img_url = $4, type = $5 WHERE id = $6', [req.body.title, req.body.subtitle, req.body.content, req.body.img_url, req.body.type, req.query.id]);
    res.redirect("/");
})

app.post("/register", async (req, res) => {
    let {name, email, password, password2} = req.body;
    console.log({
        name,
        email,
        password,
        password2
    })
    //Form Validation steps
    let errors = [];
    if(!name || !email || !password || !password2){
        errors.push({message:"Please fill in all fields."});
    }
    if(password !== password2){
        errors.push({message: "Passwords do not match"});
    }
    if(password.length < 6){
        errors.push( { message: "Password must be at least 6 characters long."})
    }
    //Handling validation errors.
    if(errors.length > 0){
        res.render('registration', {errors});
    }else{
        //Form validation has passed, generating a hash for the user.
        let hashedPassword;
        let gravatarUrl;
        try {
          gravatarUrl = gravatar.url(email, { s: '200', d: 'identicon', r: 'pg' });
          hashedPassword = await new Promise((resolve, reject) => {
              bcrypt.hash(password, 10, (err, hash) => {
                  if (err) {
                      console.error(err);
                      reject(err);
                  } else {
                      console.log('Hashed Password: ', hash);
                      resolve(hash);
                  }
              });
          });
    
          console.log("outside");
          console.log(hashedPassword);
        } catch (error) {
            // Handle errors here
            console.error(error);
            res.render('error', { message: 'Internal Server Error' });
        }
        let result = await db.query('SELECT * FROM users WHERE email = $1', [email], (err, results)=>{
            if(err){
                console.error(err);
            }else{
                console.log(results.rows);
                if(results.rows.length > 0){
                    errors.push({message:  'Email already exists.'});
                    res.render("registration", {errors})
                }else{
                    result = db.query(
                        'INSERT INTO users (name, email, password, role, grav_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, password',
                        [name, email, hashedPassword, "user", gravatarUrl],
                        (err, results) => {
                            if(err){
                                throw err;
                            }
                            console.log(results.rows);
                            req.flash('success_msg','You are now registered and can log in');
                            res.redirect("/login");
                        }
                    )
                }
            }
        })
    }
  })
  
  app.post("/login", passport.authenticate("local", {
    successRedirect:"/",
    failureRedirect:'/login',
    failureFlash: true
  }));
  

app.post("/create-post", isAdmin,  async (req, res) => {
    const blog_title = req.body.title;
    const blog_subtitle = req.body.subtitle;
    const blog_img_url = req.body.img_url;
    const blog_content = req.body.content;
    const type = req.body.type;
    //Date calculation.
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yy = String(today.getFullYear()).slice(-2);
    const formattedDate = dd + '-' + mm + '-' + yy;
    let result = await db.query('INSERT INTO blogposts (author_id, title, subtitle, date, body, img_url, type) VALUES ($1, $2, $3, $4, $5, $6, $7)', [1, blog_title, blog_subtitle, formattedDate, blog_content, blog_img_url, type]);
    console.log(result);
    res.redirect("/");
});

app.get("/logout", (req, res) => {
    req.logOut((err) => {
        if(err){
            console.error(err);
            res.redirect("/");
        }
    });
    req.flash('success_msg', 'You have logged out');
    res.redirect("/");
})

function checkAuthenticated(req, res, next){
  if(req.isAuthenticated()){
      return res.redirect("/");
  }
  next();
}

function checkNotAuthenticated(req, res, next){
  if(req.isAuthenticated()){
      return next();
  }
  res.redirect("/login");
}

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    res.redirect('/');
}

app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}.`)
})
