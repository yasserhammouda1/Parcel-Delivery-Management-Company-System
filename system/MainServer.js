import express from "express";
const app = express();
import mysql from "mysql2";
import { dirname, join } from "path";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import nodemailer from "nodemailer";
import twilio from "twilio";
import session from "express-session";
import { exec } from 'child_process';
const __dirname = dirname(fileURLToPath(import.meta.url));
const port = 4000;

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "Dashboard"),
  path.join(__dirname, "register"),
  path.join(__dirname, "login"),
]);
app.set("view engine", "ejs");
app.use(express.static(join(__dirname, "main")));
app.use(express.static(join(__dirname, "Dashboard")));
app.use(express.static(join(__dirname, "uploads")));
app.use(express.static(join(__dirname, "login")));
app.use(express.static(join(__dirname, "register")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("Dashboard"));
app.use(express.static("pages"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "Load it",
});

export default db;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hammoudayaser41@gmail.com",
    pass: "fznc kzfz oere jxhz",
  },
});

app.use(
  session({
    secret: "laod it",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const accountSid = "ACe806b0f701178d2e64c8cfdcfaddeb0c";
const authToken = "24f96b6583d1c95dddc8e037b6f8d24f";
const client = twilio(accountSid, authToken);
const generateCode = () => Math.floor(100000 + Math.random() * 900000);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);

    if (req.params.id) {
      cb(null, `${req.params.id}${ext}`);
    } else {
      const firstName = req.session.user.first_name || "unknown";
      cb(null, firstName + ext);
    }
  },
});

const upload = multer({ storage: storage });



async function fetchFirestoreData() {
  exec('node FirestoreData.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing fetchDataServer: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
  });
}


//-----------main------------------------------------------------------------------------

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "main", "index.html"));
});

//-------------------register-----------------------------------------------------------

app.get("/register", (req, res) => {
  res.render("register.ejs", { errorMessage: null });
});

app.post("/registermyinformation", async (req, res) => {
  const {
    firstName,
    familyName,
    email,
    phone,
    birthDate,
    address,
    state,
    password,
  } = req.body;

  try {
    const [existingUsers] = await db
      .promise()
      .execute("SELECT * FROM user WHERE email = ? OR phone = ?", [
        email,
        phone,
      ]);

    if (existingUsers.length > 0) {
      return res.render("register", {
        errorMessage: "The email or phone number is already in use",
      });
    }

    req.session.firstName = firstName;
    req.session.familyName = familyName;
    req.session.email = email;
    req.session.phone = phone;
    req.session.birthDate = birthDate;
    req.session.address = address;
    req.session.state = state;
    req.session.password = password;

    const emailCode = generateCode();
    const whatsappCode = generateCode();
    req.session.emailCode = emailCode.toString();
    req.session.whatsappCode = whatsappCode.toString();

    const mailOptions = {
      from: "hammoudayaser41@gmail.com",
      to: email,
      subject: "Confirm registration",
      text: `Hello ${firstName}, your email confirmation code is: ${emailCode}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    client.messages
      .create({
        body: `Hello ${firstName}, your WhatsApp confirmation code is: ${whatsappCode}`,
        from: "whatsapp:+14155238886",
        to: `whatsapp:+213${phone}`,
      })
      .then((message) => console.log("WhatsApp message sent: " + message.sid))
      .catch((err) => console.error("Error sending WhatsApp message:", err));

    res.render("confirmecode.ejs", { email, phone, errorMessage: null });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("error in the server");
  }
});

app.post("/verify-both-codes", (req, res) => {
  const { emailCode, phoneCode } = req.body;

      //req.session.whatsappCode === phoneCode

  if (
    req.session.emailCode === emailCode
  ) {
    const sql = `INSERT INTO user
      (first_name, last_name, email, phone, birthdate, address, state, password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(
      sql,
      [
        req.session.firstName,
        req.session.familyName,
        req.session.email,
        req.session.phone,
        req.session.birthDate,
        req.session.address,
        req.session.state,
        req.session.password,
      ],
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.render("confirmecode.ejs", {
            email: req.session.email,
            phone: req.session.phone,
            errorMessage:
              "An error occurred while registering data. Try again.",
          });
        }

        const insertedUserId = result.insertId;
        db.query(
          "SELECT * FROM user WHERE id = ?",
          [insertedUserId],
          (err2, rows) => {
            const user = rows[0];

            req.session.user = {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              profile_photo: user.profile_photo,
              state: user.state,
              phone: user.phone,
              email: user.email,
              password: user.password,
              birthdate: user.birthdate,
              address: user.address,
              balance: user.balance,
              created_at: user.created_at,
            };

            res.redirect("/dashboard");
          }
        );
      }
    );
  } else {
    res.render("confirmecode.ejs", {
      email: req.session.email,
      phone: req.session.phone,
      errorMessage: "Invalid symbols, try again.",
    });
  }
});

app.get("/resend-codes", (req, res) => {
  const emailCode = generateCode();
  const whatsappCode = generateCode();

  req.session.emailCode = emailCode.toString();
  req.session.whatsappCode = whatsappCode.toString();

  const mailOptions = {
    from: "hammoudayaser41@gmail.com",
    to: req.session.email,
    subject: "Confirm registration - Resend",
    text: `Hello ${req.session.firstName}, Your new Code is: ${emailCode}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error resending email:", error);
    } else {
      console.log("Email resent: " + info.response);
    }
  });

  client.messages
    .create({
      body: `Hello ${req.session.firstName}, Your new code is: ${whatsappCode}`,
      from: "whatsapp:+14155238886",
      to: `whatsapp:+213${req.session.phone}`,
    })
    .then(() => {
      res.render("confirmecode.ejs", {
        email: req.session.email,
        phone: req.session.phone,
        errorMessage: null,
      });
    })
    .catch((err) => {
      console.error("Error resending WhatsApp message:", err);
      res.render("confirmecode.ejs", {
        email: req.session.email,
        phone: req.session.phone,
        errorMessage:
          "There was an error resending the codes, try again later.",
      });
    });
});

//--------------------------------------log in -----------------------------------------

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/login", (req, res) => {

  const { email, password } = req.body;

  const sql = "SELECT * FROM user WHERE email = ?";
  db.query(sql, [email], (err, rows) => {
    if (err || rows.length === 0) {
      return res.render("login.ejs", {
        errorMessage: "Incorrect email or password",
      });
    }

    const user = rows[0];

    if (user.password === password) {
      req.session.user = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_photo: user.profile_photo,
        state: user.state,
        phone: user.phone,
        email: user.email,
        password: user.password,
        birthdate: user.birthdate,
        address: user.address,
        balance: user.balance,
        created_at: user.created_at,
      };
      

      return res.redirect("/dashboard");
    }

    res.render("login.ejs", { errorMessage: "Incorrect email or password" });
  });
});

app.get("/forgotpassword", (req, res) => {
  res.render("ForgetPass.ejs", { errorMessage: null });
});

app.post("/forgotpassword", (req, res) => {
  const email = req.body.email;

  const sql = "SELECT * FROM user WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.render("ForgetPass.ejs", {
        errorMessage: "An error occurred. Please try again.",
      });
    }

    if (results.length === 0) {
      return res.render("ForgetPass.ejs", {
        errorMessage: "The email does not exist",
      });
    }

    const code = generateCode();

    req.session.Emailforpass = email;
    req.session.emailCode = code;

    const firstName = results[0].first_name || "User";

    const mailOptions = {
      from: "hammoudayaser41@gmail.com",
      to: email,
      subject: "Confirm login",
      text: `Hello ${firstName}, Your Code is: ${code}`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        return res.render("ForgetPass.ejs", {
          errorMessage: "Failed to send the email. Please try again later.",
        });
      } else {
        return res.redirect("/entercode");
      }
    });
  });
});

app.get("/entercode", (req, res) => {
  const email = req.session.Emailforpass;
  res.render("EnterCode.ejs", { email });
});

app.post("/verify-code", (req, res) => {
  const inputCode = req.body.code;
  const sessionCode = req.session.emailCode;

  if (!sessionCode) {
    return res.render("EnterCode.ejs", {
      email: req.session.Emailforpass || "",
      errorMessage: "Session expired, please request a new code.",
    });
  }

  if (inputCode === sessionCode.toString()) {
    res.redirect("/newpassword");
  } else {
    res.render("EnterCode.ejs", {
      email: req.session.Emailforpass || "",
      errorMessage:
        "The verification code you entered is incorrect. Please try again.",
    });
  }
});

app.get("/resendcode", (req, res) => {
  const email = req.session.Emailforpass;
  const firstName = req.session.firstName || "User";

  const newCode = generateCode();
  req.session.emailCode = newCode;

  const mailOptions = {
    from: "hammoudayaser41@gmail.com",
    to: email,
    subject: "Your verification code - Resend",
    text: `Hello ${firstName}, Your new verification code is: ${newCode}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.render("EnterCode.ejs", {
        email: email,
        errorMessage: "Failed to resend code. Please try again later.",
      });
    } else {
      return res.render("EnterCode.ejs", {
        email: email,
        successMessage:
          "Verification code resent successfully. Please check your email.",
      });
    }
  });
});

app.get("/newpassword", (req, res) => {
  res.render("newpassword.ejs", { errorMessage: null });
});

app.post("/reset-password", (req, res) => {
  const newPassword = req.body.newPassword;
  const email = req.session.Emailforpass;

  const sql = "UPDATE user SET password = ? WHERE email = ?";
  db.query(sql, [newPassword, email], (error) => {
    if (error) {
      console.error(error);
      return res.render("reset-password.ejs", {
        errorMessage: "Database error.",
      });
    }

    delete req.session.Emailforpass;
    delete req.session.emailCode;

    res.redirect("/login");
  });
});

//----------------------------help--------------------------------------------------------

app.get("/help", (req, res) => {
  res.sendFile(join(__dirname, "dashboard", "Help.html"));
});

//----------------------------dashboard----------------------------------------------------------

app.get("/dashboard", async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [notificationRows] = await db
      .promise()
      .execute("SELECT * FROM notification WHERE id_user = ?", [userId]);

    const notifications = notificationRows.map((noti) => {
      return {
        ...noti,
        date: noti.created_at
          ? new Date(noti.created_at).toLocaleString("fr-FR")
          : null,
      };
    });

    const [rowshas] = await db
      .promise()
      .execute(
        "SELECT COUNT(*) as count FROM notification WHERE readd = 0 AND id_user = ?",
        [userId]
      );

    const hasUnread = rowshas[0].count > 0;

    const [userRow] = await db.promise().execute(
      "SELECT balance, idcard FROM user WHERE id = ?", [userId]);

const balance = userRow[0]?.balance;
const showRow = userRow[0]?.idcard === null;


    const [rowstel] = await db.promise().execute(
      `SELECT offices.phone 
   FROM offices
   JOIN wilayas ON offices.id_wilaya = wilayas.id
   WHERE wilayas.name = ?`,
      [req.session.user.state]
    );

    const tel = rowstel[0]?.phone || "Not available";

    const [rowsemail] = await db.promise().execute(
      `SELECT offices.email 
   FROM offices
   JOIN wilayas ON offices.id_wilaya = wilayas.id
   WHERE wilayas.name = ?`,
      [req.session.user.state]
    );

    const email = rowsemail[0]?.email || "Not available";

    const [rowsconfirmed] = await db.promise().execute(
      `
  SELECT COUNT(*) AS confirmed_count
  FROM tracking t
  JOIN parcels p ON t.id_parcel = p.id
  WHERE t.status = 'completed' AND p.user_id = ?
`,
      [userId]
    );

    const completedCount = rowsconfirmed[0].confirmed_count;

    const [rowsreturned] = await db.promise().execute(
      `
  SELECT COUNT(*) AS returned_count
  FROM tracking t
  JOIN parcels p ON t.id_parcel = p.id
  WHERE t.returnn = 1 AND p.user_id = ?
`,
      [userId]
    );

    const returnedCount = rowsreturned[0].returned_count;

    const [rows] = await db.promise().execute(
      `
  SELECT COUNT(*) AS count_active
  FROM tracking t
  JOIN parcels p ON t.id_parcel = p.id
  WHERE t.status != 'completed' AND t.returnn = 0 AND p.user_id = ?
`,
      [userId]
    );

    const pendingOrders = rows[0].count_active;

    const [rowsnumbre] = await db
      .promise()
      .execute(
        `SELECT COUNT(*) AS parcels_count FROM parcels WHERE user_id = ?`,
        [userId]
      );

    const totalOrders = rowsnumbre[0].parcels_count;

    const [TShippingOrders] = await db.promise().execute(
      `
  SELECT 
    t.created_at AS date,
    t.status AS status,
    t.returnn AS returnn,
    p.destination AS destination,
    p.product_name AS product,
    p.product_price AS total,
    p.id AS id 
  FROM tracking t
  JOIN parcels p ON t.id_parcel = p.id
  WHERE t.status != 'completed'
    AND t.status != 'draft'
    AND p.user_id = ?
`,
      [userId]
    );

    const shippingOrders = TShippingOrders.map((order) => {
      return {
        ...order,
        date: order.date.toISOString().split("T")[0],
      };
    });

    const [Orders] = await db.promise().execute(
      `
  SELECT 
    t.created_at AS date,
    t.status AS status,
    t.returnn AS returnn,
    p.destination AS destination,
    p.product_name AS product,
    p.product_price AS total,
    p.id AS id 
  FROM tracking t
  JOIN parcels p ON t.id_parcel = p.id
  WHERE p.user_id = ?
`,
      [userId]
    );

    const allOrders = Orders.map((order) => {
      const dateObj = new Date(order.date);
      return {
        ...order,
        date: dateObj.toISOString().split("T")[0],
      };
    });

    const [DraftOrders] = await db.promise().execute(
      `
  SELECT 
    t.created_at AS date,
    t.status AS status,
    p.destination AS destination,
    p.product_name AS product,
    p.product_price AS total,
    p.id AS id 
  FROM tracking t
  JOIN parcels p ON t.id_parcel = p.id
  WHERE t.status = 'draft'
    AND t.returnn = FALSE
    AND p.user_id = ?
`,
      [userId]
    );

    const draftorders = DraftOrders.map((order) => {
      return {
        ...order,
        date: order.date.toISOString().split("T")[0],
      };
    });

    const [completedorders] = await db.promise().execute(
      `
  SELECT 
    t.created_at AS date,
    t.status AS status,
    p.destination AS destination,
    p.product_name AS product,
    p.product_price AS total,
    p.id AS id 
  FROM tracking t
  JOIN parcels p ON t.id_parcel = p.id
  WHERE t.status = 'completed'
    AND t.returnn = 0
    AND p.user_id = ?
`,
      [userId]
    );

    const completedOrders = completedorders.map((order) => {
      return {
        ...order,
        date: order.date.toISOString().split("T")[0],
      };
    });

    const [Returnorders] = await db.promise().execute(
      `
  SELECT 
    t.created_at AS date,
    t.returnn AS returnn,
    t.note AS note,
    p.destination AS destination,
    p.product_name AS product,
    p.product_price AS total,
    p.id AS id 
  FROM tracking t
  JOIN parcels p ON t.id_parcel = p.id
  WHERE t.returnn = 1
    AND t.status = 'completed'
    AND p.user_id = ?
`,
      [userId]
    );

    const returnOrders = Returnorders.map((order) => ({
      ...order,
      date: new Date(order.date).toISOString().split("T")[0],
    }));

    res.render("dashbord.ejs", {
      showRow,
      email,
      userAvatar: req.session.user.profile_photo,
      username: req.session.user.last_name,
      allOrders,
      notifications,
      hasUnread,
      balance,
      tel,
      completedOrders,
      returnedCount,
      returnOrders,
      draftorders,
      shippingOrders,
      totalOrders,
      pendingOrders,
      completedCount,
    });
  } catch (error) {
    return res.redirect("/login");
  }
});

app.get("/order/:id", async (req, res) => {
  const orderId = req.params.id;

  try {
    const [rows] = await db.promise().execute(
      `
  SELECT 
  p.id,
  p.product_name AS productName,
  pt.type AS productType,
  p.quantity,
  p.weight,
  p.volume,
  p.full_name AS recipientName,
  p.phone AS recipientPhone,
  p.address AS recipientAddress,
  p.source,
  p.destination AS end,
  IF(p.home_delivery = 1, 'Home Delivery', 'Office Pickup') AS deliveryType,
  p.delivery_price AS deliveryPrice,
  p.product_price AS productPrice,
  t.status,
  t.created_at AS date,
  (p.product_price + p.delivery_price) AS total
FROM parcels p
LEFT JOIN tracking t ON t.id_parcel = p.id
LEFT JOIN product_type pt ON pt.id = p.product_type_id
WHERE p.id = ?
ORDER BY t.created_at DESC
LIMIT 1;
`,
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = rows[0];
    order.senderName =
      req.session.user.first_name + " " + req.session.user.last_name;
    order.senderPhone = req.session.user.phone;
    order.senderAddress = req.session.user.address;
    order.date = new Date(order.date).toISOString().split("T")[0];

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/saveimage/:id", upload.single("image"), (req, res) => {
  res.status(200).json({ message: "Image uploaded successfully" });
});

const imagesPath = path.join("E:", "Documents", "web PFD", "web", "uploads");

app.get("/importimage/:id", (req, res) => {
  const { id } = req.params;

  const extensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

  let foundImage = null;

  for (const ext of extensions) {
    const fullPath = path.join(imagesPath, id + ext);
    if (fs.existsSync(fullPath)) {
      foundImage = fullPath;
      break;
    }
  }
  if (!foundImage) {
    return res.status(404).send("Image not found");
  }

  res.download(foundImage, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send("Failed to download image");
    }
  });
});

app.get("/setting", async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.redirect("/login");
  }

  const userId = req.session.user.id;

  const [notification] = await db
    .promise()
    .execute("SELECT * FROM notification WHERE id_user = ?", [userId]);

  const notifications = notification.map((noti) => {
    return {
      ...noti,
      date: noti.created_at
        ? new Date(noti.created_at).toLocaleString("fr-FR")
        : null,
    };
  });

  const [rowshas] = await db
    .promise()
    .execute(
      "SELECT COUNT(*) as count FROM notification WHERE readd = 0 AND id_user = ?",
      [userId]
    );

  const hasUnread = rowshas[0].count > 0;

 const [userRow] = await db
  .promise()
  .execute("SELECT balance, idcard FROM user WHERE id = ?", [userId]);

const balance = userRow[0]?.balance;
const showRow = userRow[0]?.idcard === null;

let userAvatar=null;

const [rows] = await db.promise().query('SELECT profile_photo FROM user WHERE id = ?', [userId]);
    if (rows.length > 0) {
       userAvatar = rows[0].profile_photo;
      }


  res.render("setting.ejs", {
    notifications,
    hasUnread,
    balance,
    userAvatar,
    username: req.session.user.last_name,
    showRow,
  });
});

app.get("/neworder", async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.redirect("/login");
  }

  const userId = req.session.user.id;

  const [notification] = await db
    .promise()
    .execute("SELECT * FROM notification WHERE id_user = ?", [userId]);

  const notifications = notification.map((noti) => {
    return {
      ...noti,
      date: noti.created_at
        ? new Date(noti.created_at).toLocaleString("fr-FR")
        : null,
    };
  });

  const [rows] = await db
    .promise()
    .execute(
      "SELECT COUNT(*) as count FROM notification WHERE readd = 0 AND id_user = ?",
      [userId]
    );

  const [rowshas] = await db
    .promise()
    .execute(
      "SELECT COUNT(*) as count FROM notification WHERE readd = 0 AND id_user = ?",
      [userId]
    );

  const hasUnread = rowshas[0].count > 0;

  const [rowsbalance] = await db
    .promise()
    .execute("SELECT balance FROM user WHERE id = ?", [userId]);

  const balance = rowsbalance[0]?.balance;

  res.render("pages/add-order.ejs", { notifications, hasUnread, balance });
});

app.post("/notifications/mark-read", async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [result] = await db
      .promise()
      .execute(
        "UPDATE notification SET readd = 1 WHERE readd = 0 AND id_user = ?",
        [userId]
      );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send("Failed to update notifications");
  }
});

app.get("/notifications/unread", async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [rows] = await db
      .promise()
      .execute(
        "SELECT COUNT(*) AS count FROM notification WHERE readd = 0 AND id_user = ?",
        [userId]
      );
    const unreadCount = rows[0].count;
    res.json({ unreadCount });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch unread notifications count" });
  }
});

app.post("/update-account-info", upload.single("profile-photo"), (req, res) => {
  const userId = req.session.user.id;
  if (!userId) return res.status(400).send("User ID required");

  const updates = [];
  const values = [];

  if (req.body["first-name"]) {
    updates.push("first_name = ?");
    values.push(req.body["first-name"]);
  }

  if (req.body["last-name"]) {
    updates.push("last_name = ?");
    values.push(req.body["last-name"]);
  }

  if (req.body["state"]) {
    updates.push("state = ?");
    values.push(req.body["state"]);
  }

  if (req.file?.filename) {
    updates.push("profile_photo = ?");
    values.push(req.file.filename);
  }

  if (updates.length === 0) {
    return res.status(400).send("No data provided to update");
  }

  values.push(userId);
  const sql = `UPDATE user SET ${updates.join(", ")} WHERE id = ?`;

  db.execute(sql, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Database update failed");
    }
    res.redirect('/setting');
  });
});
app.post("/delete-account", async (req, res) => {
  const { password } = req.body;
  const userId = req.session.user.id;

  try {
    const [rows] = await db.promise().execute("SELECT * FROM user WHERE id = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = rows[0];

    if (password !== user.password) {
      return res.status(401).send("Incorrect password");
    }

    const [parcels] = await db.promise().execute("SELECT id FROM parcels WHERE user_id = ?", [userId]);
    const parcelIds = parcels.map(p => p.id);

    if (parcelIds.length > 0) {
      await db.promise().execute(
        `DELETE FROM tracking WHERE id_parcel IN (${parcelIds.map(() => '?').join(',')})`,
        parcelIds
      );
    }

    await db.promise().execute("DELETE FROM parcels WHERE user_id = ?", [userId]);

    await db.promise().execute("DELETE FROM notification WHERE id_user = ?", [userId]);

    await db.promise().execute("DELETE FROM user WHERE id = ?", [userId]);

    req.session.destroy(() => {
      res.redirect("/");
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/api/orders", async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      productName,
      productType,
      quantity,
      weight,
      volume,
      price,
      startDestination,
      endDestination,
      homeDelivery,
      freeDelivery,
      deliveryPrice,
      recipientName,
      recipientPhone,
      recipientAddress,
      notes,
    } = req.body;

    const [typeRows] = await db
      .promise()
      .execute("SELECT id FROM product_type WHERE type = ?", [productType]);

    if (typeRows.length === 0) {
      return res.status(400).json({ error: "Invalid product type" });
    }

    const productTypeId = typeRows[0].id;

    const [result] = await db.promise().execute(
      `INSERT INTO parcels (
        user_id, product_name, product_type_id, product_price, quantity, weight, volume,
        source, destination, delivery_price,
        full_name, phone, address, note,
        home_delivery, free_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        productName,
        productTypeId,
        price,
        quantity,
        weight,
        volume,
        startDestination,
        endDestination,
        deliveryPrice,
        recipientName,
        recipientPhone,
        recipientAddress,
        notes,
        homeDelivery,
        freeDelivery,
      ]
    );

    const parcelId = result.insertId;

    await db.promise().execute(
      `INSERT INTO tracking (
        id_parcel, status, problematic, returnn, note
      ) VALUES (?, 'Draft', false, false, '')`,
      [parcelId]
    );

    res.status(201).json({
  message: "Order and tracking created",
  id: parcelId,
  senderName: req.session.user.first_name + " " + req.session.user.last_name,
  senderPhone: req.session.user.phone,
});


  } catch (error) {
    console.error("Error saving order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/delete-order/:id", async (req, res) => {
  const orderId = req.params.id;

  try {
    await db
      .promise()
      .execute("DELETE FROM tracking WHERE id_parcel = ?", [orderId]);

    await db.promise().execute("DELETE FROM parcels WHERE id = ?", [orderId]);
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/verify-old-password", (req, res) => {
  const { oldPassword } = req.body;
  if (user && req.session.user.password === oldPassword) {
    return res.sendStatus(200);
  } else {
    return res.sendStatus(401);
  }
});

app.post("/send-verification-code", async (req, res) => {
  const { email, phone, firstName } = req.body;

  const emailCode = generateCode();
  const whatsappCode = generateCode();

  req.session.verification = {
    emailCode,
    whatsappCode,
  };

  try {
    if (email) {
      const mailOptions = {
        from: "hammoudayaser41@gmail.com",
        to: email,
        subject: "Confirm registration",
        text: `Hello ${firstName}, your email confirmation code is: ${emailCode}`,
      };

      await transporter.sendMail(mailOptions);
    }

    if (phone) {
      await client.messages.create({
        body: `Hello ${firstName}, your WhatsApp confirmation code is: ${whatsappCode}`,
        from: "whatsapp:+14155238886",
        to: `whatsapp:+213${phone}`,
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error sending verification codes:", err);
    res.sendStatus(500);
  }
});

app.post("/verify-code", (req, res) => {
  const { email_code, phone_code } = req.body;
  const { emailCode, phoneCode } = req.session.verification || {};

  if (
    (email_code && email_code !== emailCode) ||
    (phone_code && phone_code !== phoneCode)
  ) {
    return res.sendStatus(401);
  }

  res.sendStatus(200);
});

app.post("/update-contact-info", async (req, res) => {
  const userId = req.session.user?.id;
  const { email, phone, newPassword } = req.body;

  if (!userId) return res.sendStatus(401);

  try {
    const updates = [];
    const values = [];

    if (email) {
      updates.push("email = ?");
      values.push(email);
    }

    if (phone) {
      updates.push("phone = ?");
      values.push(phone);
    }

    if (newPassword) {
      updates.push("password = ?");
      values.push(newPassword);
    }

    if (updates.length === 0) return res.sendStatus(400);

    const query = `UPDATE user SET ${updates.join(", ")} WHERE id = ?`;
    values.push(userId);

    await db.promise().execute(query, values);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});


app.get('/log-out', (req, res) => {
  if (req.session.user) {
    delete req.session.user;
  }

  res.redirect('/');
});

app.listen(port, () => {
  console.log(`The server is running on port ${port}`);
});

fetchFirestoreData();