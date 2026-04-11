(function initBadguyFirebase() {
  const ENV = window.BADGUY_ENV || {};
  const FIREBASE_API_KEY = ENV.firebaseApiKey || "__FIREBASE_API_KEY__";
  const FIREBASE_PROJECT_ID =
    ENV.firebaseProjectId || "__FIREBASE_PROJECT_ID__";

  const hasFirebaseApiKey =
    FIREBASE_API_KEY && !String(FIREBASE_API_KEY).startsWith("__");
  const hasFirebaseProjectId =
    FIREBASE_PROJECT_ID && !String(FIREBASE_PROJECT_ID).startsWith("__");

  const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
    messagingSenderId: "827626639989",
    appId: "1:827626639989:web:432cc64bc40b990c0e5e3c",
    measurementId: "G-VZL5Q3J2F2",
  };

  try {
    if (!window.firebase) {
      console.warn("Firebase SDK chưa tải xong.");
      window.badguyDbReady = false;
      return;
    }

    if (!hasFirebaseApiKey || !hasFirebaseProjectId) {
      console.warn("Thiếu FIREBASE_API_KEY hoặc FIREBASE_PROJECT_ID.");
      window.badguyDbReady = false;
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();
    const sessionsRef = db.collection("sessions");

    function getSessionDateKey(now) {
      const current = now || new Date();
      const dd = String(current.getDate()).padStart(2, "0");
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const yyyy = current.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    }

    async function saveDailySummary(payload) {
      const dateKey = getSessionDateKey();

      await sessionsRef.doc(dateKey).set(
        {
          dateKey,
          summaryText: payload.summaryText || "",
          courtFee: payload.courtFee ?? 0,
          shuttleCount: payload.shuttleCount ?? 0,
          shuttleFee: payload.shuttleFee ?? 0,
          total: payload.total ?? 0,
          maleFee: payload.maleFee ?? 0,
          femaleFee: payload.femaleFee ?? 0,
          femalesCount: payload.femalesCount ?? 0,
          malesCount: payload.malesCount ?? 0,
          setPlayersCount: payload.setPlayersCount ?? 0,
          players: Array.isArray(payload.players) ? payload.players : [],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          clientUpdatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return { dateKey };
    }

    async function getRecentSessions(maxItems) {
      const limitSize = maxItems || 14;
      const snapshot = await sessionsRef
        .orderBy("updatedAt", "desc")
        .limit(limitSize)
        .get();

      return snapshot.docs.map((sessionDoc) => {
        const data = sessionDoc.data();
        return {
          id: sessionDoc.id,
          ...data,
        };
      });
    }

    window.badguyDb = {
      saveDailySummary,
      getRecentSessions,
    };
    window.badguyDbReady = true;
  } catch (error) {
    console.warn("Init Firebase thất bại", error);
    window.badguyDbReady = false;
  }
})();
