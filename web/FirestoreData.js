import admin from 'firebase-admin';
import mysql from 'mysql2/promise';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./driverapp-ad96e-firebase-adminsdk-fbsvc-6589603cb7.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function transferToMySQL() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "load it"
  });

  const snapshot = await db.collection("deliveries").get();
  const latestStatuses = {};

  for (const doc of snapshot.docs) {
    const data = doc.data();
    data.docId = doc.id;
    const parcelId = data.id_parcel;
    const createdAt = Number(data.created_at);

    if (!latestStatuses[parcelId] || createdAt > Number(latestStatuses[parcelId].created_at)) {
      latestStatuses[parcelId] = data;
    }
  }

  for (const status of Object.values(latestStatuses)) {
    try {
      console.log(status);

      const updateTrackingSQL = `
        UPDATE tracking
        SET 
          id_driver = NULLIF(?, ''),
          id_truck = NULLIF(?, ''),
          status = ?,
          created_at = ?
        WHERE id_parcel = ?;
      `;

      const trackingValues = [
        status.id_driver || '',
        status.id_truck || '',
        status.status,
        status.created_at,
        status.id_parcel
      ];

      const [result] = await connection.execute(updateTrackingSQL, trackingValues);

      const [trackingRows] = await connection.execute(
        `SELECT id, returnn, problematic FROM tracking WHERE id_parcel = ?`,
        [status.id_parcel]
      );

      if (trackingRows.length === 0) {
        console.warn(`No tracking record found for parcel id: ${status.id_parcel}`);
        continue;
      }

      const trackingId = trackingRows[0].id;
      const returnn = trackingRows[0].returnn || false;
      const problematic = trackingRows[0].problematic || false;

      const insertArchiveSQL = `
        INSERT INTO archive_tracking (
          id_tracking,
          id_parcels,
          id_driver,
          id_truck,
          status,
          returnn,
          problamic,
          created_at
        ) VALUES (?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?, ?);
      `;

      const archiveValues = [
        trackingId,
        status.id_parcel,
        status.id_driver || '',
        status.id_truck || '',
        status.status,
        returnn,
        problematic,
        status.created_at
      ];

      await connection.execute(insertArchiveSQL, archiveValues);

      await db.collection("deliveries").doc(status.docId).delete();

    } catch (err) {
      console.error(`Error processing parcel ${status.id_parcel}:`, err.message);
    }
  }

  await connection.end();
}

transferToMySQL().catch(console.error);
