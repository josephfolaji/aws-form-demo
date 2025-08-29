import React, { useEffect, useState } from "react";
// URL of the API Gateway endpoint
const API_BASE = "https://2ekywu083h.execute-api.ca-central-1.amazonaws.com";

// Cognito branding domain and app client details
const COGNITO_DOMAIN = "https://entry-submission.auth.ca-central-1.amazoncognito.com";
const CLIENT_ID = "5nhpbl76qvjj8k0pi5rm1qhr5l";
const REDIRECT_URI = "http://localhost:3000";
const OAUTH_URL = `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=token&scope=openid+email+profile&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
//Pull JWT out of the URL fragment after login
function parseHashForIdToken() {
  if (window.location.hash.startsWith("#")) {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.get("id_token");
  }
  return null;
}

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [jwt, setJwt] = useState(null);

  // On load, check for id_token in URL fragment
  useEffect(() => {
    const token = parseHashForIdToken();
    if (token) {
      setJwt(token);
      window.location.hash = ""; // clean URL
    }
    fetchItems();
  }, []);
// Fetch all the items from the table
  async function fetchItems() {
    setError("");
    try {
      //Get the items from the table throw errorr otherwise
      const response = await fetch(`${API_BASE}/items`);
      if (!response.ok) throw new Error(`GET /items failed: ${response.status}`);
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    //If editing ID is set update the item, else create a new one
    const payload = editingId ? { id: editingId, name, email } : { name, email };

    try {
      const res = await fetch(`${API_BASE}/items`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`PUT /items failed: ${res.status}`);
      await fetchItems();// relad the list
      resetForm();//Clear the items
    } catch (e) {
      setError(e.message);
    }
  }
   //When editing an item, populate the form with its data
  function startEditing(item) {
    setEditingId(item.id);
    setName(item.name || "");
    setEmail(item.email || "");
  }
//REset the form to blank
  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
  }
//Delete an item by ID
  async function handleDelete(id) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: "DELETE",
        headers: {
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`DELETE /items/${id} failed: ${res.status}`);
      await fetchItems();
    } catch (e) {
      setError(e.message);
    }
  }
//Format timestamps for display
  const format = timestamp => (timestamp ? new Date(timestamp).toLocaleString() : "—");

  // If not logged in, show login screen
  if (!jwt) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <h1>Please log in</h1>
        <a href={OAUTH_URL}>
          <button>Login with Cognito</button>
        </a>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor : "grey" , maxWidth: 800, margin: "32px auto", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1>Form Submissions</h1>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>Error: {error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 420, marginBottom: 24 }}>
        <input
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit">{editingId ? "Update" : "Create"}</button>
          {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
          <button type="button" onClick={fetchItems}>Refresh</button>
        </div>
      </form>

      <h2>Items</h2>
      {!items.length && <div>No items yet.</div>}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {items.map(item => (
          <li key={item.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {item.name} <span style={{ color: "#666" }}>({item.email})</span>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  id: {item.id} · created: {format(item.createdAt)} · updated: {format(item.updatedAt)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`${API_BASE}/items/${item.id}`} target="_blank" rel="noreferrer">Open</a>
                <button type="button" onClick={() => startEditing(item)}>Edit</button>
                <button type="button" onClick={() => handleDelete(item.id)}>Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
