(function initBadguyFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyBo5lzQGvEs34fVxy6nqo4NuFINhwegE_0",
    authDomain: "badguys-app.firebaseapp.com",
    projectId: "badguys-app",
    storageBucket: "badguys-app.firebasestorage.app",
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
