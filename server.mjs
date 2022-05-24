import Alexa, { SkillBuilders } from "ask-sdk-core";
import { ExpressAdapter } from "ask-sdk-express-adapter";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import moment from "moment";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8000;
// const localURL = `mongodb://localhost:27017/alexa-pizza-booking-db`;
const cloudURL = `mongodb+srv://admin:12345@nodejscluster01.u7jbf.mongodb.net/alexa-pizza-booking-db?retryWrites=true&w=majority`;

app.use(morgan("dev"));

// db Connections
mongoose
  .connect(cloudURL)
  .then(() => {
    console.log(`Database is successfully conntect`);
  })
  .catch((e) => {
    console.log(`Database is not conntected : ${e}`);
  });

// function pluck(arr) {
//   const randIndex = Math.floor(Math.random() * arr.length);
//   return arr[randIndex];
// }

const orderSchema = new mongoose.Schema({
  topping: String,
  size: String,
  qty: Number,
  name: String,
  address: String,
  status: {
    type: String,
    default: "PENDING", // PENDING , PERPARING / CANCELED , DISPATCH , DELEVERED
  },
  createdOn: { type: Date, default: Date.now },
});

const orderModel = new mongoose.model("Orders", orderSchema);

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  handle(handlerInput) {
    const speakOutput = `
                <speak>
                    <voice name="Justin">
                        <amazon:emotion name="excited" intensity="high">
                        <s>Hello</s>
                        <s> I'm your Pizza Rider </s>
                        <s> I am here to automate your pizza delivery</s>
                        <s>What would you like to order today ?</s>
                        </amazon:emotion>
                    </voice>
               </speak>
                       `;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const placeOrderIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "placeOrder"
    );
  },
  async handle(handlerInput) {
    // console.log("request came: ", JSON.stringify(handlerInput.requestEnvelope));

    const topping = Alexa.getSlot(handlerInput.requestEnvelope, "topping");
    const size = Alexa.getSlot(handlerInput.requestEnvelope, "size");
    const qty = Alexa.getSlot(handlerInput.requestEnvelope, "qty");
    console.log("topping: ", topping);
    console.log("size: ", size);
    console.log("qty: ", qty);

    try {
      if (!topping.value) {
        const speakOutput = `
      <speak>
          <voice name="Justin">
              <amazon:emotion name="excited" intensity="high">
             <p>
             <s>What topping would you like to have</s>
             <s>We have pepperoni, ranch and fajita</s>
             </p>
              </amazon:emotion>
          </voice>
      </speak>`;
        return (
          handlerInput.responseBuilder
            .speak(speakOutput)
            .addElicitSlotDirective("topping")
            // .reprompt(speakOutput)
            .getResponse()
        );
      } else if (!size.value) {
        const speakOutput = `
      <speak>
          <voice name="Justin">
              <amazon:emotion name="excited" intensity="high">
             <p>
             <s>Ok</s>
             <s>${topping.value} pizza, what size of pizza would you like to order</s>
             <s>We have large that serves 4, medium that serves 2 and small that serves 1</s>
             </p>
              </amazon:emotion>
          </voice>
      </speak>`;
        return (
          handlerInput.responseBuilder
            .speak(speakOutput)
            // .reprompt(speakOutput)
            .addElicitSlotDirective("size")
            .getResponse()
        );
      } else if (!qty.value) {
        const speakOutput = `
          <speak>
            <voice name="Justin">
              <amazon:emotion name="excited" intensity="medium">
                <p>
                  <s> ok ${size.value} ${topping.value} pizza </s> 
                  <s> How many? </s>
                  <s> you can say a number like one, two or three </s>
                </p>
              </amazon:emotion>
            </voice>
          </speak>
      `;
        return (
          handlerInput.responseBuilder
            .speak(speakOutput)
            // .reprompt(speakOutput)
            .addElicitSlotDirective("qty")
            .getResponse()
        );
      } else {
        const apiAccessToke = Alexa.getApiAccessToken(
          handlerInput.requestEnvelope
        );
        let fullName = await axios(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
          {
            headers: {
              Authorization: `Bearer ${apiAccessToke}`,
            },
          }
        );
        let email = await axios(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.email",
          {
            headers: {
              Authorization: `Bearer ${apiAccessToke}`,
            },
          }
        );

        console.log("fullName : ", fullName.data);
        console.log("email : ", email.data);

        const saveDoc = await orderModel.create({
          topping: topping.value,
          size: size.value,
          qty: qty.value,
          name: fullName.data,
          address: email.data,
        });
        console.log("Save Documents ", saveDoc);

        const speakOutput = `
      <speak>
          <voice name="Justin">
              <amazon:emotion name="excited" intensity="high">
              <s>Thank you!</s>
              <s>Your Order is placed</s>
              </amazon:emotion>
          </voice>
      </speak>`;
        return (
          handlerInput.responseBuilder
            .speak(speakOutput)
            // .reprompt(speakOutput)
            .getResponse()
        );
      }
    } catch (error) {
      console.log("catch Error: ", error);
    }
  },
};

const checkOrderIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "checkOrder"
    );
  },
  async handle(handlerInput) {
    // console.log("request came: ", JSON.stringify(handlerInput.requestEnvelope));

    try {
      const apiAccessToke = Alexa.getApiAccessToken(
        handlerInput.requestEnvelope
      );
      let fullName = await axios(
        "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
        {
          headers: {
            Authorization: `Bearer ${apiAccessToke}`,
          },
        }
      );
      let email = await axios(
        "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.email",
        {
          headers: {
            Authorization: `Bearer ${apiAccessToke}`,
          },
        }
      );
      console.log("fullName : ", fullName.data);
      console.log("email : ", email.data);

      let lastOrder = await orderModel
        .findOne({ email: email.data })
        .sort({ _id: -1 })
        .exec();

      const lastOrderDate = moment(lastOrder.createdOn).fromNow();
      console.log("LastOrderDate : ", moment(lastOrder.createdOn).fromNow());
      let speakOutput = "";
      if (lastOrder.status === "DELEVERED") {
        speakOutput = `
        <speak>
        <voice name="Justin">
            <amazon:emotion name="excited" intensity="medium">
            <p>
                <s>Dear customer ${fullName.data}. Your last order of ${lastOrder.qty} ${lastOrder.topping} pizza was placed ${lastOrderDate} and it  was delivered successfully!</s>
            <s>You have no order in progress</s>
            <s>Please feel free to say order pizza whenever you want</s>
                <s>I am your pizza rider</s>
                <s>Happy to help</s>
            </p>
            </amazon:emotion>
        </voice>
        </speak>      
        `;
      } else {
        speakOutput = `
        <speak>
        <voice name="Justin">
            <amazon:emotion name="excited" intensity="medium">
            <p>
                <s>Dear customer ${fullName.data}. Your last order of ${lastOrder.qty} ${lastOrder.topping} pizza was placed ${lastOrderDate} and it is in ${lastOrder.status}</s>
                <s>I am your pizza rider</s>
                <s>Please be patient. your order is our highest priority.</s>
            </p>
            </amazon:emotion>
        </voice>
        </speak>      
        `;
      }
      return (
        handlerInput.responseBuilder
          .speak(speakOutput)
          // .reprompt(speakOutput)
          .getResponse()
      );
    } catch (error) {
      console.log("catch Error: ", error);
    }
  },
};
const repeatOrderIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "repeatOrder"
    );
  },
  async handle(handlerInput) {
    // console.log("request came: ", JSON.stringify(handlerInput.requestEnvelope));

    try {
      const apiAccessToke = Alexa.getApiAccessToken(
        handlerInput.requestEnvelope
      );
      let fullName = await axios(
        "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
        {
          headers: {
            Authorization: `Bearer ${apiAccessToke}`,
          },
        }
      );
      let email = await axios(
        "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.email",
        {
          headers: {
            Authorization: `Bearer ${apiAccessToke}`,
          },
        }
      );
      console.log("fullName : ", fullName.data);
      console.log("email : ", email.data);

      let lastOrder = await orderModel
        .findOne({ email: email.data })
        .sort({ _id: -1 })
        .exec();

      const lastOrderDate = moment(lastOrder.createdOn).fromNow();
      console.log("LastOrderDate : ", moment(lastOrder.createdOn).fromNow());
      let speakOutput = "";
      if (
        handlerInput.requestEnvelope.request.intent.confirmationStatus ===
        "NONE"
      ) {
        speakOutput = `
        <speak>
        <voice name="Justin">
            <amazon:emotion name="excited" intensity="medium">
            <p>
                <s>I heard you want to repeat your last order of ${lastOrder.qty} ${lastOrder.size} ${lastOrder.topping} pizza </s>
            <s>It is that correct?</s>
            </p>
            </amazon:emotion>
        </voice>
        </speak>      
        `;
        return (
          handlerInput.responseBuilder
            .speak(speakOutput)
            .addConfirmIntentDirective(handlerInput.requestEnvelope.request.intent)
            .getResponse()
        );
      }else
      if (
        handlerInput.requestEnvelope.request.intent.confirmationStatus ===
        "DENIED"
      ) {
        speakOutput = `
        <speak>
        <voice name="Justin">
            <amazon:emotion name="excited" intensity="medium">
            <p>
            <s>Okay, no order was placed</s>
                <s>Please feel free to say "order pizza" or repeat my "last order" whenever you want</s>
                <s>I am your pizza rider </s>
                <s>Happy to help</s>
            </p>
            </amazon:emotion>
        </voice>
        </speak>      
        `;
        return (
          handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse()
        );
      }
      else
      if (
        handlerInput.requestEnvelope.request.intent.confirmationStatus ===
        "CONFIRMED"
      ) {
        // databse entry
        const saveDoc = await orderModel.create({
          topping: lastOrder.topping,
          size:  lastOrder.size,
          qty:  lastOrder.qty,
          name: fullName.data,
          address: email.data,
        });
        console.log("Save Documents ", saveDoc);
        
        speakOutput = `
        <speak>
        <voice name="Justin">
            <amazon:emotion name="excited" intensity="medium">
            <p>
                <s>Okay, order placed for ${lastOrder.qty} ${lastOrder.size} ${lastOrder.topping} pizza</s>
                <s>I am your pizza rider</s>
                <s>Please be patient. your order is our highest priority.</s>
                <s>You can ask me about your order any time.</s>
            </p>
            </amazon:emotion>
        </voice>
        </speak>      
        `;
        return (
          handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse()
        );

      }
    } catch (error) {
      console.log("catch Error: ", error);
    }
  },
};
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const speakOutput =
      "Sorry, I had trouble doing what you asked. Please try again.";
    console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

let skillBuilder = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    placeOrderIntentHandler,
    checkOrderIntentHandler,
    repeatOrderIntentHandler
  )
  .addErrorHandlers(ErrorHandler);

let skill = skillBuilder.create();

let adapter = new ExpressAdapter(skill, false, false);

app.post("/api/v1/alexa-webhook", adapter.getRequestHandlers());

app.use(express.json());
app.use(cors());

app.get("/alexa", (req, res) => {
  res.send("Welcome in alexa hotel booking app");
});

app.listen(PORT, () => {
  console.log(`Server is upon running on port ${PORT}`);
});
