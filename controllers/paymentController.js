import paypal from 'paypal-rest-sdk';
import nodemailer from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();

const my_email = process.env.MY_EMAIL;
const my_pass = process.env.MY_PASS;

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: my_email,
        pass: my_pass
    }
});
function sendMail(Semail) {
    return new Promise((resolve, reject) => {
      const mailOptions = {
        from: my_email,
        to: Semail,
        subject: `Here's your ebook. Enjoy!`,
        text:  "Download at https://drive.google.com/file/d/19m6y4sH08Tfifx3-sXkY6hMaUpmg9hIr/view?usp=sharing"
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

function sendConfirmation(Semail) {
    return new Promise((resolve, reject) => {
      const mailOptions = {
        from: my_email,
        to: Semail,
        subject: `Payment received successfully!`,
        text:  "Can't wait to see you at the event."
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

function sendPaymentMade(Semail, paymentObj, paymentId) {
    return new Promise((resolve, reject) => {
        const { name, email, phone, date, time, people, customAmount } = paymentObj;
    
        const orderDetails = `
        Order Details:
        Name: ${name}
        Email: ${email}
        Phone: ${phone}
        Date of Event: ${date}
        Time of Event: ${time}
        Number of People: ${people}
        Quoted Amount: ${customAmount}
        `;

      const mailOptions = {
        from: my_email,
        to: my_email,
        subject: `Payment received successfully! With payment ID:  ${paymentId}`,
        text: orderDetails
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

const { PAYPAL_MODE, PAYPAL_CLIENT_KEY, PAYPAL_SECRET_KEY } = process.env;

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': process.env.PAYPAL_CLIENT_ID,
  'client_secret': process.env.PAYPAL_CLIENT_SECRET
});


const renderBuyPage = async(req,res)=>{

    try {
        const cart = req.session.cart || [];
        res.render('payment.ejs', { cart });

    } catch (error) {
        console.log(error.message);
    }

}

const payProduct = async(req,res)=>{

    try {
        console.log("Successful Received: " + req.body.email);
        var customAmount = parseFloat(req.body.customAmount).toFixed(2);
        if(req.body.customAmount == undefined){
            customAmount = 15.00;
            req.session.email = req.body.email;
            req.session.purchaseType = "ebook";
        }else{
            req.session.email = req.body.email;
            req.session.paymentObj = req.body;
        }
        console.log(customAmount);
        req.session.customAmount = customAmount;
        
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": "http://milanocooking.onrender.com/success",
                "cancel_url": "http://milanocooking.onrender.com/cart"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "item",
                        "sku": "item",
                        "price": customAmount,
                        "currency": "EUR",
                        "quantity": 1
                     }]
                 },
                "amount": {
                    "currency": "EUR",
                    "total": customAmount
                },
                "description": "Custome payment."
            }]
        };

        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
                throw error;
            } else {
                for(let i = 0;i < payment.links.length;i++){
                  if(payment.links[i].rel === 'approval_url'){
                    res.redirect(payment.links[i].href);
                  }
                }
            }
          });

    } catch (error) {
        console.log(error.message);
    }

}

const successPage = async(req,res)=>{

    try {
        
        var customAmount = req.session.customAmount;
        console.log(customAmount);
        const payerId = req.query.PayerID;
        const paymentId = req.query.paymentId;

        const execute_payment_json = {
            "payer_id": payerId,
            "transactions": [{
                "amount": {
                    "currency": "EUR",
                    "total": customAmount
                }
            }]
        };

        paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
            if (error) {
                console.log(error.response);
                throw error;
            } else {
                console.log(JSON.stringify(payment));
        //         let o_id = payment.id;
        // let o_status = payment.state;
        // let o_payment = parseFloat(payment.transactions[0].related_resources[0].sale.receivable_amount.value);
        // let c_email = payment.payer.payer_info.email;
        // let c_address = payment.payer.payer_info.shipping_address;
        // let o_datetime = payment.create_time;

        console.log("Successful: " + req.body);

        const Semail = req.session.email;

        console.log(Semail);
        if(req.session.purchaseType == "ebook"){
            sendMail(Semail);
        }else{
            sendConfirmation(Semail);
            sendPaymentMade(Semail, req.session.paymentObj, req.query.paymentId);
        }

        // payment.transactions.forEach(transaction => {
        //     transaction.item_list.items.forEach(item => {
        //         let d_id = item.sku;
        //         let d_name = item.name;
        //         let d_quantity = item.quantity;
        //         connection.query(`INSERT INTO order_tb (o_id, d_id, d_name, d_quantity, o_payment, c_email, c_address, o_datetime, o_status, r_id) VALUES
        //         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,[o_id, d_id, d_name, d_quantity, o_payment, c_email, c_address, o_datetime, 'Order Confirmation', 2] , (err, res) => {
        //             if(err){
        //                 console.log(err);
        //             }
        //         })
        //     })
                
        //     }
        // )
                req.session.email = null;
                req.session.purchaseType = null;
                req.session.paymentObj = null;
                req.session.customAmount = null;
                res.render('success', {oid: paymentId});
            }
        });

    } catch (error) {
        console.log(error.message);
    }

}

const cancelPage = async(req,res)=>{

    try {

        res.render('cancel');

    } catch (error) {
        console.log(error.message);
    }

}

export  {
    renderBuyPage,
    payProduct,
    successPage,
    cancelPage
}
