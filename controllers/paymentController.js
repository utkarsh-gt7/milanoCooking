import paypal from 'paypal-rest-sdk';

const { PAYPAL_MODE, PAYPAL_CLIENT_KEY, PAYPAL_SECRET_KEY } = process.env;

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': "AfTW_Z1tZWsCQR-wWEeRVd2zhpHRs0jzOVFZQgJ782xw1mK9BNCRNY1-1YQBoSy57pXTjfhjcyPFVwJG",
  'client_secret': "EKmNnw4-okwQLElkiY6cbvW167eKljy1WBv1fq5TPmRG_H5-JsLg2gF3RVEnC0npGCbjQxobmm1Ryhvh"
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
        console.log("Successful Received: " + req.body.customAmount);
        const customAmount = parseFloat(req.body.customAmount).toFixed(2);
        console.log(customAmount);
        req.session.customAmount = customAmount;
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": "http://localhost:4000/success",
                "cancel_url": "http://localhost:4000/cart"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "item",
                        "sku": "item",
                        "price": customAmount,
                        "currency": "USD",
                        "quantity": 1
                     }]
                 },
                "amount": {
                    "currency": "USD",
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
        
        const customAmount = req.session.customAmount;
        console.log(customAmount);
        const payerId = req.query.PayerID;
        const paymentId = req.query.paymentId;

        const execute_payment_json = {
            "payer_id": payerId,
            "transactions": [{
                "amount": {
                    "currency": "USD",
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
                req.session.cart = [];
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