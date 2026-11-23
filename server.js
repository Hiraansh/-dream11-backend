const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

// ============ IN-MEMORY STORAGE (mock database) ============
const users = [];
const matches = [];
const contests = [];
const teams = []; // user's fantasy teams
const joinedContests = []; // records of which user joined which contest with which team
const transactions = [];
const notifications = [];

// ============ SEED MOCK DATA ============

// Seed a sample match
const sampleMatchId = 'match_1';
matches.push({
  matchId: sampleMatchId,
  teamHomeId: 'team_home',
  teamAwayId: 'team_away',
  teamHomeCode: 'IND',
  teamAwayCode: 'AUS',
  matchTitle: 'India vs Australia',
  matchDate: new Date(Date.now() + 86400000).toISOString(),
  venue: 'Wankhede Stadium, Mumbai',
  status: 'Upcoming',
  teamHomePlayers: [
    { playerId: 'p1', name: 'Virat Kohli', role: 'Batsman', team: 'IND', credits: 9.5 },
    { playerId: 'p2', name: 'Rohit Sharma', role: 'Batsman', team: 'IND', credits: 9.0 },
    { playerId: 'p3', name: 'Jasprit Bumrah', role: 'Bowler', team: 'IND', credits: 8.5 },
    { playerId: 'p4', name: 'Ravindra Jadeja', role: 'All-rounder', team: 'IND', credits: 8.0 },
    { playerId: 'p5', name: 'MS Dhoni', role: 'Wicketkeeper', team: 'IND', credits: 7.5 },
    { playerId: 'p6', name: 'Hardik Pandya', role: 'All-rounder', team: 'IND', credits: 8.0 },
    { playerId: 'p7', name: 'Bhuvneshwar Kumar', role: 'Bowler', team: 'IND', credits: 7.0 },
    { playerId: 'p8', name: 'KL Rahul', role: 'Batsman', team: 'IND', credits: 8.5 },
    { playerId: 'p9', name: 'Ravichandran Ashwin', role: 'Bowler', team: 'IND', credits: 7.5 },
    { playerId: 'p10', name: 'Shubman Gill', role: 'Batsman', team: 'IND', credits: 8.0 },
    { playerId: 'p11', name: 'Mohammed Shami', role: 'Bowler', team: 'IND', credits: 7.0 },
    { playerId: 'p12', name: 'Suryakumar Yadav', role: 'Batsman', team: 'IND', credits: 8.5 },
    { playerId: 'p13', name: 'Axar Patel', role: 'All-rounder', team: 'IND', credits: 7.5 },
    { playerId: 'p14', name: 'Kuldeep Yadav', role: 'Bowler', team: 'IND', credits: 7.0 },
  ],
  teamAwayPlayers: [
    { playerId: 'p15', name: 'Steve Smith', role: 'Batsman', team: 'AUS', credits: 9.0 },
    { playerId: 'p16', name: 'David Warner', role: 'Batsman', team: 'AUS', credits: 8.5 },
    { playerId: 'p17', name: 'Pat Cummins', role: 'Bowler', team: 'AUS', credits: 8.5 },
    { playerId: 'p18', name: 'Marnus Labuschagne', role: 'Batsman', team: 'AUS', credits: 8.0 },
    { playerId: 'p19', name: 'Josh Hazlewood', role: 'Bowler', team: 'AUS', credits: 7.5 },
    { playerId: 'p20', name: 'Alex Carey', role: 'Wicketkeeper', team: 'AUS', credits: 7.0 },
    { playerId: 'p21', name: 'Mitchell Starc', role: 'Bowler', team: 'AUS', credits: 8.0 },
    { playerId: 'p22', name: 'Travis Head', role: 'Batsman', team: 'AUS', credits: 8.5 },
    { playerId: 'p23', name: 'Glenn Maxwell', role: 'All-rounder', team: 'AUS', credits: 8.0 },
    { playerId: 'p24', name: 'Adam Zampa', role: 'Bowler', team: 'AUS', credits: 7.5 },
    { playerId: 'p25', name: 'Marcus Stoinis', role: 'All-rounder', team: 'AUS', credits: 7.5 },
    { playerId: 'p26', name: 'Cameron Green', role: 'All-rounder', team: 'AUS', credits: 7.5 },
    { playerId: 'p27', name: 'Mitchell Marsh', role: 'All-rounder', team: 'AUS', credits: 8.0 },
    { playerId: 'p28', name: 'Sean Abbott', role: 'Bowler', team: 'AUS', credits: 7.0 },
  ],
});

// Seed sample contests (FREE - price = 0)
const contest1 = {
  _id: 'contest_1',
  matchId: sampleMatchId,
  name: 'Grand League - Free',
  price: 0, // FREE
  totalSpots: 10000,
  spotsLeft: 9999,
  numWinners: 100,
  prizeDetails: [{ rank: 1, prize: 0 }, { rank: 2, prize: 0 }],
  teamsId: [],
  teams: [],
};
contests.push(contest1);

const contest2 = {
  _id: 'contest_2',
  matchId: sampleMatchId,
  name: 'Head to Head - Free',
  price: 0, // FREE
  totalSpots: 2,
  spotsLeft: 2,
  numWinners: 1,
  prizeDetails: [{ rank: 1, prize: 0 }],
  teamsId: [],
  teams: [],
};
contests.push(contest2);

// ============ MIDDLEWARE: simple token auth ============
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const user = users.find(u => u.token === token);
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  req.user = user;
  next();
}

// ============ AUTH ROUTES ============

// Register
app.post('/auth/register', (req, res) => {
  const { myform } = req.body;
  if (!myform) {
    return res.status(400).json({ message: 'Missing form data' });
  }
  const existing = users.find(u => u.email === myform.email);
  if (existing) {
    return res.status(400).json({ message: 'User already exists' });
  }
  const user = {
    _id: 'user_' + uuidv4().slice(0, 8),
    username: myform.username || myform.email.split('@')[0],
    email: myform.email,
    password: myform.password,
    token: uuidv4(),
    wallet: 0,
    totalAmountAdded: 0,
    totalAmountWon: 0,
    accountNumber: null,
    ifsc: null,
  };
  users.push(user);
  // Default notification
  notifications.push({
    id: uuidv4(),
    userId: user._id,
    message: 'Welcome to Fantasy Cricket!',
    createdAt: new Date().toISOString(),
    read: false,
  });
  return res.json({
    server_token: user.token,
    token: user.token,
    user,
  });
});

// Login
app.post('/auth/logine', (req, res) => {
  const { myform } = req.body;
  const user = users.find(u => u.email === myform.email && u.password === myform.password);
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  return res.json({
    token: user.token,
    user,
  });
});

// Load user
app.get('/auth/loaduser', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

// Save bank details
app.post('/auth/save-bank', authMiddleware, (req, res) => {
  const { accountNumber, ifsc, userId } = req.body;
  const user = users.find(u => u._id === userId);
  if (user) {
    user.accountNumber = accountNumber;
    user.ifsc = ifsc;
  }
  return res.json({ data: { accountNumber, ifsc, accountHolder: req.user.username } });
});

// Save FCM token
app.post('/auth/save-token', authMiddleware, (req, res) => {
  return res.json({ success: true });
});

// ============ MATCH ROUTES ============

// Get all matches
app.get('/getupcoming', (req, res) => {
  return res.json({ matches });
});

// Get match details
app.get('/getmatch/:matchId', (req, res) => {
  const match = matches.find(m => m.matchId === req.params.matchId || m._id === req.params.matchId);
  if (!match) {
    return res.status(404).json({ message: 'Match not found' });
  }
  return res.json({ match });
});

// Get players for a match (frontend calls /getplayers_new/:id)
app.get('/getplayers_new/:matchId', (req, res) => {
  const match = matches.find(m => m.matchId === req.params.matchId || m._id === req.params.matchId);
  if (!match) {
    return res.status(404).json({ message: 'Match not found' });
  }
  return res.json({
    players: [...match.teamHomePlayers, ...match.teamAwayPlayers],
    live: false,
    matchdetails: match,
  });
});

// ============ TEAM ROUTES ============

// Get user's teams for a match
app.get('/getteam/', (req, res) => {
  const { matchId, userid } = req.query;
  const userTeams = teams.filter(t => t.matchId === matchId && t.userId === userid);
  return res.json({ team: userTeams });
});

// Get user's teams by match team IDs
app.get('/getteam/:teamHomeId/:teamAwayId', (req, res) => {
  const userid = req.query.userid;
  const userTeams = teams.filter(t => t.userId === userid);
  return res.json({ lmplayers: [], teams: userTeams });
});

// Save a fantasy team
app.post('/saveteam', authMiddleware, (req, res) => {
  const { matchId, players, captain, viceCaptain } = req.body;
  const team = {
    _id: 'team_' + uuidv4().slice(0, 8),
    userId: req.user._id,
    matchId,
    players,
    captain,
    viceCaptain,
    points: 0,
    createdAt: new Date().toISOString(),
  };
  teams.push(team);
  return res.json({ team });
});

// ============ CONTEST ROUTES ============

// Get all contests for a match
app.get('/getcontests/:matchId', (req, res) => {
  const matchContests = contests.filter(c => c.matchId === req.params.matchId);
  return res.json({ contests: matchContests });
});

// Get a specific contest
app.get('/getcontest/:contestId', (req, res) => {
  const contest = contests.find(c => c._id === req.params.contestId);
  if (!contest) {
    return res.status(404).json({ message: 'Contest not found' });
  }
  return res.json({ contest });
});

// Get teams of a contest (for leaderboard)
app.get('/getteamsofcontest/:contestId', (req, res) => {
  const contest = contests.find(c => c._id === req.params.contestId);
  if (!contest) {
    return res.status(404).json({ message: 'Contest not found' });
  }
  // Return mock leaderboard teams sorted by points
  const leaderboardTeams = contest.teams.map((t, index) => ({
    _id: t._id,
    userId: t.userId,
    points: Math.floor(Math.random() * 500) + 100,
    rank: index + 1,
    username: t.username || 'User',
  })).sort((a, b) => b.points - a.points);
  return res.json({
    teams: leaderboardTeams,
    match: matches.find(m => m.matchId === contest.matchId),
    contest,
  });
});

// ============ JOIN CONTEST ============

// Frontend calls: GET /joincontest/:contestId?teamid=...
app.get('/joincontest/:contestId', authMiddleware, (req, res) => {
  const { contestId } = req.params;
  const { teamid } = req.query;
  const contest = contests.find(c => c._id === contestId);
  if (!contest) {
    return res.status(404).json({ message: 'Contest not found' });
  }
  if (contest.spotsLeft <= 0) {
    return res.status(400).json({ message: 'Contest is full' });
  }
  // Check if user already joined
  const alreadyJoined = joinedContests.find(jc => jc.contestId === contestId && jc.userId === req.user._id);
  if (alreadyJoined) {
    return res.status(400).json({ message: 'Already joined this contest' });
  }
  // Entry is free (price = 0), so no wallet deduction
  contest.spotsLeft -= 1;
  contest.teamsId.push(teamid || 'unknown');
  const team = teams.find(t => t._id === teamid);
  if (team) {
    contest.teams.push({
      _id: team._id,
      userId: req.user._id,
      username: req.user.username,
      points: 0,
      rank: 0,
    });
  }
  joinedContests.push({
    contestId,
    userId: req.user._id,
    teamId: teamid,
    joinedAt: new Date().toISOString(),
  });
  return res.json({ message: 'Joined successfully', contest });
});

// Rejoin contest (swap team)
app.get('/reJoinCn/', (req, res) => {
  return res.json({ message: 'rejoined' });
});

// Get user's joined contests
app.get('/getjoinedcontest/:matchId', authMiddleware, (req, res) => {
  const { matchId } = req.params;
  const { userid } = req.query;
  const userJoined = joinedContests.filter(jc => (userid ? jc.userId === userid : jc.userId === req.user._id));
  // Enrich with contest details
  const contestsWithDetails = userJoined.map(jc => {
    const contest = contests.find(c => c._id === jc.contestId);
    return {
      ...jc,
      contest: contest || { _id: jc.contestId, matchId, name: 'Unknown Contest', price: 0 },
    };
  });
  return res.json({ contests: contestsWithDetails });
});

// ============ PAYMENT ROUTES (disabled - free app) ============

app.post('/payment/deposit', authMiddleware, (req, res) => {
  return res.status(400).json({ message: 'Deposits disabled - app is free' });
});

app.post('/payment/withdraw', authMiddleware, (req, res) => {
  return res.status(400).json({ message: 'Withdrawals disabled - app is free' });
});

app.get('/payment/status', (req, res) => {
  return res.json({ status: 'failed', message: 'Payments disabled' });
});

app.get('/payment/my-transactions/:userId', (req, res) => {
  return res.json([]);
});

// ============ NOTIFICATION ROUTES ============

app.get('/notifications/user-notifications', authMiddleware, (req, res) => {
  const userNotifs = notifications.filter(n => n.userId === req.user._id).slice(0, 10);
  return res.json(userNotifs);
});

app.get('/notifications/user-unread-count/:userId', authMiddleware, (req, res) => {
  const count = notifications.filter(n => n.userId === req.params.userId && !n.read).length;
  return res.json({ count });
});

app.put('/notifications/mark-read/:userId', authMiddleware, (req, res) => {
  notifications.filter(n => n.userId === req.params.userId).forEach(n => { n.read = true; });
  return res.json({ success: true });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Sample match: ${sampleMatchId}`);
  console.log(`Contests: ${contests.length} (all free)`);
});

module.exports = app;
