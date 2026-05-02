const updateStreak = async (user) => {
  if (!user) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  let isUpdated = false;

  if (!user.lastActiveDate) {
    user.lastActiveDate = new Date();
    user.streak = 1;
    isUpdated = true;
  } else {
    const lastActiveStr = user.lastActiveDate.toISOString().split('T')[0];

    if (todayStr !== lastActiveStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActiveStr === yesterdayStr) {
        user.streak += 1;
      } else {
        user.streak = 1;
      }
      user.lastActiveDate = new Date();
      isUpdated = true;
    }
  }

  if (isUpdated) {
    await user.save();
  }

  return user;
};

module.exports = { updateStreak };
