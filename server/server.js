import express from "express";
import fetch from "node-fetch";
import "dotenv/config";
import path from "path";
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from "firebase-admin/auth";
import dns from "dns"

const { PORT = 8888 } = process.env;
const base = "https://api-m.sandbox.paypal.com";
const app = express();
const firebase = initializeApp({
  credential: applicationDefault(),
  databaseURL: "https://schoolapp-c2f68-default-rtdb.firebaseio.com"
})
const PAYPAL_CLIENT_ID = "AYlcdeFJHurMDI4HpZtUaEsvjcFsjLkLWtWNg24Pau7jVdb9x-PpgNw9pJcVaWP1zawraVHCEaIogxo0"
const PAYPAL_CLIENT_SECRET = "EFyuXGZJAaz72IX9Q6FTgY-jjtaCRpB8u9JMMNniAn4Vjdk8JDJXhecITFLdxjzPrx8hgpP6o0dW7aGx"
//NOTE: host static files
app.use(express.static("client"));

//INFO: parse post params sent in body in json format
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://192.168.5.10:3000");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "POST", "GET", "PUT", "DELETE")
  next();
});
/**
 *
 *INFO: Generate an OAuth 2.0 access token for authenticating with PayPal REST APIs.
 * @see https://developer.paypal.com/api/rest/authentication/
 */

let userInformation = []

const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

/**
 *PERF: Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */



const createOrder = async (items, amount) => {
  //INFO: use the cart information passed from the front-end to calculate the purchase unit details

  console.log(
    "shopping cart information passed from the frontend createOrder() callback:",
    items,
  );

  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount,
        items
      },
    ],
  };

  console.log(payload.purchase_units[0])
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      //NOTE: Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
    method: "POST",
    body: JSON.stringify(payload),
  });


  return handleResponse(response);
};

/**
 *TODO: Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
const captureOrder = async (orderID) => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return handleResponse(response);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}
app.post("/api/update", async (req, res) => {

  const result = req.body
  const uid = result.uid

  getAuth(firebase).getUser(uid).then(async (userRecord) => {
    const user = userRecord.toJSON()
    if (user !== null) {
      res.status(200).json(user)
      console.log(user)
    } else {
      res.status(204).json({ message: "No user found" })
    }

  })

})

//TODO: Get hostnames function 
// dns.reverse(ipAddress, (err, hostnames) => {
//   if (err) {
//     console.error("DNS lookup failed with error: ", err)
//   } else {
//     console.log("Hostnames for", hostnames)
//   }
// })
//
app.post("/api/getIp", async (req, res) => {
  const ipAddress = req.body
  const ip = ipAddress.ip
})


app.post("/api/windowsGetInfo", async (req, res) => {

  const windowsInfo = req.body



  if (windowsInfo !== null) {
    const { CsPrimaryOwnerName: hostname, CsTotalPhysicalMemory } = windowsInfo
    let totalMemory = CsTotalPhysicalMemory / (1024 * 1024 * 1024)
    let MemoryToGB = totalMemory.toFixed(0)
    console.log(`Hostname: ${hostname} ` + `Total Memory: ${MemoryToGB}GB`)
  }
  // if (res.status(200)) {
  //   res.status(200).json({ message: "windows information received" })
  //   y
  // }
})

app.post("/api/editAuth", async (req, res) => {
  const auth = req.body
  const uid = auth.uid

  if (auth.password !== null) {

    getAuth(firebase).updateUser(uid, {
      email: auth.email,
      displayName: auth.displayName,
      password: auth.password,

    }).then((userRecord) => {
      console.log(userRecord)
      res.status(200).json({ message: "User updated successfully" })
    }).catch((error) => {
      res.status(404).json({ message: error })
    })
  } else {

    getAuth(firebase).updateUser(uid, {
      email: auth.email,
      displayName: auth.displayName,

    }).then((userRecord) => {
      console.log(userRecord)
      res.status(200).json({ message: "User updated successfully" })
    }).catch((error) => {
      res.status(404).json({ message: error })
    })
  }

})

app.post("/api/editUser", async (req, res) => {

  const userResult = req.body
  const uid = userResult.uid
  getAuth(firebase).getUser(uid).then(async (userRecord) => {
    const user = userRecord.toJSON()
    if (user.length !== null) {
      res.status(200).json(user)
    } else {
      res.status(204).json({ message: "No user found" })
    }
  })

})

app.post("/api/users", async (req, res) => {
  try {
    getAuth(firebase).listUsers(1000).then(async (result) => {
      const data = await result.users
      if (data.length > 0) {
        res.status(200).json(data);
      } else {
        res.status(204).json({ message: " No users found" })
      }
    })
    // use the cart information passed from the front-end to calculate the order amount detals
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(404).json({ error: "connect error" })
  }

});

app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    console.log(jsonResponse)
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

// serve index.html
// app.get("/", (req, res) => {
//   res.sendFile(path.resolve("./client/checkout.html"));
// });
//

app.listen(PORT, () => {
  console.log(`Node server listening at http://localhost:${PORT}/`);

});
