const today = () => new Date().toISOString().slice(0, 10);

const nextId = (items) =>
  items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;

export const store = {
  users: [
    { id: 1, name: "sahasra", role: "citizen", status: "active" },
    { id: 2, name: "teju", role: "citizen", status: "active" },
    { id: 3, name: "tanu", role: "politician", status: "active" },
    { id: 4, name: "deepthi", role: "moderator", status: "active" },
    { id: 5, name: "System Admin", role: "admin", status: "active" },
  ],
  issues: [
    {
      id: 1,
      title: "Streetlight outage on Maple Street",
      description: "Three lights have been out for 2 weeks near bus stop.",
      category: "Infrastructure",
      location: "Ward 4",
      status: "Open",
      createdBy: "Ava Citizen",
      priority: "High",
      response: "",
      updatedAt: today(),
    },
  ],
  feedback: [
    {
      id: 1,
      message: "Weekly transit updates are helpful. Please include route maps.",
      type: "Suggestion",
      createdBy: "Liam Citizen",
      status: "Pending",
      flagged: false,
      moderatorNote: "",
      createdAt: today(),
    },
  ],
  updates: [
    {
      id: 1,
      title: "Budget Hearing Reminder",
      message: "Public budget hearing is scheduled for Friday at City Hall.",
      audience: "All Citizens",
      author: "Maya Patel",
      createdAt: today(),
    },
  ],
  moderationLog: [],
};

export { nextId, today };
