const Listing = require("./models/listing");
const Review = require("./models/review");

module.exports.isLoggedIn = (req, res, next) => { 
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash("error", "You must be signed in first!");
        return res.redirect("/users/login");
    }
    next();
}

module.exports.savedRedirectUrl = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
}

module.exports.isOwner = async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You don't have permission to do that!");
        return res.redirect(`/listings/${id}`);
    }
    next();
}


module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    try {
        // Fetch the review by its ID and populate the author field
        const review = await Review.findById(reviewId).populate('author');

        // Check if the review exists
        if (!review) {
            req.flash("error", "Review not found!");
            return res.redirect(`/listings/${id}`);
        }

        // Check if the current user is the author of the review
        if (!review.author || !review.author.equals(req.user._id)) {
            req.flash("error", "You are not authorized to do that!");
            return res.redirect(`/listings/${id}`);
        }

        // Proceed if the user is the author
        next();
    } catch (error) {
        console.error("Authorization error:", error);
        req.flash("error", "Something went wrong!");
        if (id) {
            return res.redirect(`/listings/${id}`);
        } else {
            return res.redirect('/listings');
        }
    }
};
