'use strict';
var mongoose = require('mongoose');
var User = mongoose.model('User');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_PUB);



exports.check_premium = async function(req, res) {
  // console.log("check premium");
  const id = req.user._id;

  const user = await User.findById(id);

  if (!user) {
    return res.status(200).send(false);
  }

  // console.log("USER PREM");
  // console.log(user.subscription.premium);

  if (user.subscription.premium === "paid"){
    return res.status(200).json(true);
  } else {
    return res.status(200).send(false);
  }
};


exports.checkout_session = async function(req, res) {
  try {

    const coupon = await stripe.coupons.create({
      percent_off: 25,
      duration: 'repeating',
      duration_in_months: 3,
      max_redemptions: 100,
      name: "Summer discount",
      redeem_by: Math.floor(Date.now() / 1000) + (86400 * 30) // Expires in 30 days
    });

    var couponId = -1;

    if (!coupon || !coupon.id) {
      couponId = -1;
    } else {
      couponId = coupon.id;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Lifetime Access',
          },
          unit_amount: 9500,
          // unit_amount: 100,
        },
        quantity: 1,
      }],
      metadata: {
        userId: req.user._id,
        email: req.user.email,
        price: (couponId != -1) ? "71$" : "95$",
        productId: ((couponId != -1)) ? "lifetime04_discount" : 'lifetime04'
        // promoCode: 'SPRINGSALE',
      },
      discounts: (couponId != -1) ? [{ coupon: couponId }] : [],
      mode: 'payment',
      success_url: 'https://inspostories.com/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://inspostories.com/premium',
    });

    return res.json({ id: session.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.checkout_30credits = async function(req, res) {
  try {

    console.log("ADD 30 CREDITS");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '45 Credits',
          },
          // unit_amount: 1400,
          unit_amount: 1400
        },
        quantity: 1,
      }],
      metadata: {
        userId: req.user._id,
        email: req.user.email,
        price: "14$",
        productId: '45credits',
        creditsNumber: 45
        // promoCode: 'SPRINGSALE',
      },
      mode: 'payment',
      success_url: 'https://inspostories.com/payment-credits?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://inspostories.com/premium',
    });

    return res.json({ id: session.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.checkout_100credits = async function(req, res) {
  try {

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '100 Credits',
          },
          unit_amount: 2900,
        },
        quantity: 1,
      }],
      metadata: {
        userId: req.user._id,
        email: req.user.email,
        price: "29$",
        productId: '100credits',
        creditsNumber: 100
        // promoCode: 'SPRINGSALE',
      },
      mode: 'payment',
      success_url: 'https://inspostories.com/payment-credits?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://inspostories.com/premium',
    });

    return res.json({ id: session.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


exports.add_credits = async function(req, res) {
  // console.log("verifysession");
  // console.log(req.body);
  const { session_id } = req.body;
  console.log("ADD CREDITS");
  console.log(session_id);

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const userId = session.metadata.userId;
    var creditsNumber = session.metadata.creditsNumber;

    console.log(userId);
    console.log(creditsNumber);

    if (creditsNumber != 45 || creditsNumber != 100 ){
      creditsNumber = 45;
    }

    try {
      await User.findByIdAndUpdate(userId, { 
        $set: { credits: creditsNumber }, 
        $push: { credits_history: { date: new Date(), credits_number: creditsNumber } }
      },);
      // console.log('Stripe db added/updated successfully.');
    } catch (error) {
      console.error('Error updating:', error);
      return res.status(500).send('Error updating');
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error('Failed to retrieve session:', error);
    return res.status(500).send('Internal Server Error');
  }
};

exports.verify_session = async function(req, res) {
  // console.log("verifysession");
  // console.log(req.body);
  const { session_id } = req.body;
  // console.log(session_id);

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const userId = session.metadata.userId;

    // console.log(userId);

    try {
      await User.findByIdAndUpdate(userId, { subscription: {
        "status": "paid",
        "type": session.metadata.productId,
        "amount": session.metadata.price,
        "date": Date.now(),
        "email": session.metadata.email
      } });
      // console.log('Stripe db added/updated successfully.');
    } catch (error) {
      console.error('Error updating:', error);
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error('Failed to retrieve session:', error);
    return res.status(500).send('Internal Server Error');
  }
};