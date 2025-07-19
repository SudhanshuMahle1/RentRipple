if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const Listing = require("./models/listing")
const Review = require('./models/review');
const Experience = require('./models/experience');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const multer = require('multer')
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const { isLoggedIn } = require('./middleware');
const { savedRedirectUrl } = require('./middleware');
const { isOwner } = require('./middleware');
const { isReviewAuthor } = require('./middleware');
const engine = require('ejs-mate');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeoCoding({ accessToken: mapToken })
const moment = require('moment');


const port = 3000;

const { cloudinary, storage } = require('./cloudConfig.js');
const { access } = require('fs');
const upload = multer({ storage });

const MONGO_URL = "mongodb://127.0.0.1:27017/AirBnb";

// Connect to MongoDB
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("Connection error:", err));

// Set up view engine
app.set('view engine', 'ejs');
app.engine('ejs', engine);
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(flash());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));


const sessionOptions = {
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
    }
};

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

app.locals.moment = moment;;
app.use((req, res, next) => {
    res.locals.curruser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});


// Routes

// Home route
app.get("/", async (req, res) => {
  try {
    const topListings = await Listing.find({}).populate("reviews").limit(4);
    const randomListings = await Listing.aggregate([{ $sample: { size: 6 } }]);
    const guestReviews = await Review.find({}).populate("author").sort({ createdAt: -1 }).limit(6);
    const experiences = await Experience.find({}).limit(6); // fetch experience data

    res.render("listings/home", { topListings, randomListings, guestReviews, experiences });
  } catch (error) {
    console.error("Error loading home page:", error);
    res.status(500).send("Internal Server Error");
  }
});


// //Index route
app.get('/listings', async (req, res) => {
    try {
        const listings = await Listing.find({}).populate("reviews");

        // Calculate average rating for each listing
        listings.forEach(listing => {
            let totalRating = 0;
            listing.reviews.forEach(review => {
                totalRating += review.rating || 0;
            });
            listing.avgRating = listing.reviews.length ? (totalRating / listing.reviews.length).toFixed(1) : null;
        });

        res.render("listings/index", { listings,mapToken });
    } catch (error) {
        console.error("Error fetching listings:", error);
        res.status(500).send("Internal Server Error");
    }
});



// New route
app.get("/listings/new", isLoggedIn, (req, res) => {

    res.render("listings/new");
});

//Show route
app.get("/listings/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch the listing, populating reviews and their authors
        const listing = await Listing.findById(id)
            .populate({
                path: "reviews",
                populate: {
                    path: "author",  // Populate the 'author' of the review
                    select: "username"  // Only select the 'username' field from the author
                }
            })
            .populate("owner");  // Populate the 'owner' field if necessary

        if (!listing) {
            req.flash('error', 'Listing not found');
            return res.redirect('/listings');
        }

        // Make sure owner exists before passing to the view
        if (!listing.owner) {
            console.log('Owner not found for this listing');
        }

        const coordinates = (listing.geometry && Array.isArray(listing.geometry.coordinates) && listing.geometry.coordinates.length === 2)
            ? listing.geometry.coordinates
            : [77.209, 28.6139];

        // Render the listing details page with mapToken and coordinates for enhanced Mapbox integration
        res.render("listings/show", { listing, mapToken, coordinates });
    } catch (error) {
        console.error("Error fetching listing:", error);
        res.status(500).send("Internal Server Error");
    }
});


// Create route
app.post("/listings", isLoggedIn, upload.single('listing[image]'), async (req, res) => {
    try {
        let geoFeature;
        try {
            const response = await geocodingClient.forwardGeocode({
                query: req.body.listing.location,
                limit: 1,
            }).send();
            geoFeature = response.body.features[0];
        } catch (geoErr) {
            console.error("⚠️ Mapbox Geocoding failed:", geoErr.message);
        }

        const listingData = req.body.listing;
        const newlisting = new Listing({
            name: listingData.name,
            description: listingData.description,
            address: listingData.address,
            country: listingData.country,
            location: listingData.location,
            price: listingData.price,
            type: listingData.type,
            guests: listingData.guests,
            bedrooms: listingData.bedrooms,
            bathrooms: listingData.bathrooms,
            checkin: listingData.checkin,
            checkout: listingData.checkout,
            amenities: listingData.amenities,
            rules: listingData.rules,
        });
        newlisting.owner = req.user._id;

        if (req.file) {
            newlisting.image = {
                url: req.file.path,
                filename: req.file.filename
            };
        }

        if (geoFeature && Array.isArray(geoFeature.geometry.coordinates)) {
            newlisting.geometry = geoFeature.geometry;
        } else {
            newlisting.geometry = {
                type: "Point",
                coordinates: [77.209, 28.6139],
            };
        }

        await newlisting.save();
        // req.user.listings.push(newlisting);
        // await req.user.save();

        console.log("✅ Listing saved:", newlisting);
        req.flash('success', 'Listing created successfully!');
        res.redirect("/listings");
    } catch (error) {
        console.error('❌ Error creating listing:', error.message);
        console.error(error.stack);
        req.flash('error', 'Failed to create listing. ' + error.message);
        res.redirect("/listings/new");
    }
});

// Edit route
app.get("/listings/:id/edit", isLoggedIn, isOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).send('Listing not found');
        }
        let originalImageUrl = listing.image.url;
        originalImageUrl.replace("/upload", "/upload/h_30,w_30,c_scale")

        res.render("listings/edit", { listing, originalImageUrl });
    } catch (error) {
        console.error("Error fetching listing for edit:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Update route
app.put("/listings/:id", isLoggedIn, isOwner, upload.single('listing[image]'), async (req, res) => {
    try {
        const { id } = req.params;
        ;
        let listing = await Listing.findById(id);

        await Listing.findByIdAndUpdate(id, { ...req.body.listing })
        if (typeof req.file !== 'undefined') {
            let url = req.body.path;
            let filename = req.body.filename;
            listing.image = { url, filename };
            await listing.save();
        }
        req.flash('success', 'Listing updated successfully!');
        res.redirect(`/listings/${id}`);
    } catch (error) {
        console.error("Error updating listing:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Delete route
app.delete("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
    try {
        const { id } = req.params;
        await Listing.findByIdAndDelete(id);
        req.flash('success', 'Listing deleted successfully!');
        res.redirect("/listings");
    } catch (error) {
        console.error("Error deleting listing:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Review post route
app.post("/listings/:id/reviews", isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);
    
        if (!listing) {
            return res.status(404).send('Listing not found');
        }
    
        // Ensure geometry is set, if missing provide a default
        if (!listing.geometry || !listing.geometry.type) {
            listing.geometry = {
                type: 'Point',
                coordinates: [0, 0] // Default coordinates, modify based on your needs
            };
        }
    
        const newReview = new Review(req.body.review);
        // Ensure the rating defaults to 0 if not provided
        newReview.rating = req.body.review.rating || 0;
        newReview.author = req.user._id;
        listing.reviews.push(newReview);
        await newReview.save();
        await listing.save();
    
        req.flash('success', 'Listing reviewed successfully!');
        res.redirect(`/listings/${id}`);
    } catch (error) {
        console.error("Error saving review:", error);
        res.status(500).send(`Error in commenting: ${error.message}`);
    }
});

// // Review delete route
app.delete("/listings/:id/reviews/:reviewId", isLoggedIn, isReviewAuthor, async (req, res) => {
    try {
        const { id, reviewId } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) {
            req.flash('error', 'Listing not found!');
            return res.redirect('/listings');
        }
        // Remove the review from the listing's reviews array
        await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
        // Delete the review from the Review collection
        await Review.findByIdAndDelete(reviewId);
        req.flash('success', 'Review deleted successfully!');
        res.redirect(`/listings/${id}`);
    } catch (error) {
        console.error("Error deleting review:", error);
        req.flash('error', 'Internal Server Error');
        res.redirect(`/listings/${req.params.id}`);
    }
});

//signup route
app.get("/users/signup", (req, res) => {
    res.render("users/signup");
});

//signup post route
app.post("/signup", async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', 'Welcome to AirBnb!');
            res.redirect("/listings");
        });
    } catch (error) {
        console.error("Error creating user:", error);
        req.flash('error', error.message);
        res.redirect("/users/signup");
    }
});

// Login route
app.get("/users/login", (req, res) => {
    res.render("users/login");
});

// Login post route
app.post("/users/login", savedRedirectUrl, passport.authenticate("local",
    { failureFlash: true, failureRedirect: "/users/login" }),
    async (req, res) => {
        req.flash('success', 'Welcome back!');
        res.redirect(res.locals.returnTo || "/listings");
    });


// Logout route
app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Goodbye! Have a nice day!');
        res.redirect("/listings");
    });
});



// Start server
app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
