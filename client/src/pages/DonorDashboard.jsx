import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import LocationPicker from "../components/LocationPicker";
import DonationItem from "../components/DonationItem";

const DonorSidebar = () => (
  <div className="sidebar">
    <ul className="sidebar-menu">
      <li>
        <Link to="/donor">Dashboard</Link>
      </li>
      <li>
        <Link to="/donor/add-donation">Add Donation</Link>
      </li>
      <li>
        <Link to="/donor/history">My Donations</Link>
      </li>
      <li>
        <Link to="/donor/profile">My Profile</Link>
      </li>
    </ul>
  </div>
);

const DonorHome = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    picked: 0,
  });

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await axios.get("/api/donations/my-donations");
      setDonations(response.data.donations);
      setStats({
        total: response.data.donations.length,
        pending: response.data.donations.filter((d) => d.status === "pending")
          .length,
        accepted: response.data.donations.filter((d) => d.status === "accepted")
          .length,
        picked: response.data.donations.filter((d) => d.status === "picked_up")
          .length,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Welcome 🙏, {user?.name}!</h2>
        <Link to="/donor/add-donation" className="btn btn-primary">
          + Add Donation
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Donations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--warning)" }}>
            {stats.pending}
          </div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--accent)" }}>
            {stats.accepted}
          </div>
          <div className="stat-label">Accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>
            {stats.picked}
          </div>
          <div className="stat-label">Picked Up</div>
        </div>
      </div>
      <h3 style={{ marginBottom: "1rem" }}>Recent Donations</h3>
      <div className="grid grid-3">
        {donations.slice(0, 6).map((d) => (
          <div key={d._id} className="card">
            <div className="card-header">
              <h4 className="card-title">{d.foodName}</h4>
              <span className={`card-badge badge-${d.status}`}>{d.status}</span>
            </div>
            <p>
              Quantity: {d.quantity} {d.unit}
            </p>
            <p>Type: {d.foodType === "cooked" ? "🍲 Cooked" : "📦 Packaged"}</p>
            {d.foodType === "packaged" && d.expiryDate && (
              <p
                style={{
                  color:
                    new Date(d.expiryDate) < new Date() ? "#f44336" : "#4caf50",
                }}
              >
                Expires: {new Date(d.expiryDate).toLocaleDateString()}
              </p>
            )}
            {d.foodType === "cooked" && d.preparationTime && (
              <p style={{ color: "#2196f3" }}>
                Prepared: {new Date(d.preparationTime).toLocaleString()}
              </p>
            )}
            {d.pickupId && (
              <p style={{ marginTop: "0.5rem", fontWeight: "600" }}>
                Pickup ID: {d.pickupId}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to check if packaged product is expired
const isProductExpired = (expiryDate) => {
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return expiry < today;
};

// Helper function to get days until expiry (only for packaged food)
const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper to check if item is complete based on food type
const isItemComplete = (item) => {
  if (item.foodType === "cooked") {
    // Cooked food needs: foodName, quantity, mealType, preparationTime
    return !!(
      item.foodName &&
      item.quantity &&
      item.mealType &&
      item.preparationTime
    );
  } else {
    // Packaged food needs: foodName, quantity, expiryDate
    return !!(item.foodName && item.quantity && item.expiryDate);
  }
};

// AI Analysis Display Component - Updated for both food types
const AIAnalysisDisplay = ({ items, itemSafetyStatus }) => {
  if (!items || items.length === 0) return null;

  // Calculate overall safety stats based on food type
  const calculateOverallSafety = () => {
    let expiredCount = 0;
    let safeCount = 0;
    let pendingCount = 0;
    let incompleteCount = 0;

    items.forEach((item, index) => {
      const safety = itemSafetyStatus?.[index];

      if (item.foodType === "cooked") {
        // Cooked food: needs preparation time and meal type
        if (!item.preparationTime || !item.mealType) {
          incompleteCount++;
          pendingCount++;
        } else if (safety?.canDonate === true) {
          safeCount++;
        } else if (safety?.canDonate === false) {
          expiredCount++;
        } else {
          pendingCount++;
        }
      } else {
        // Packaged food: needs expiry date and not expired
        if (!item.expiryDate) {
          incompleteCount++;
          pendingCount++;
        } else if (isProductExpired(item.expiryDate)) {
          expiredCount++;
        } else {
          safeCount++;
        }
      }
    });

    let message = "";
    let color = "";

    if (expiredCount > 0) {
      message = `${expiredCount} item(s) are expired/unsafe and cannot be donated.`;
      color = "#f44336";
    } else if (incompleteCount > 0) {
      message = `${incompleteCount} item(s) need information. Please fill in missing fields.`;
      color = "#ff9800";
    } else {
      message = `All ${safeCount} item(s) are ready for donation!`;
      color = "#4caf50";
    }

    return {
      expiredCount,
      safeCount,
      pendingCount,
      incompleteCount,
      message,
      color,
    };
  };

  const safetyStats = calculateOverallSafety();

  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: "12px",
        marginBottom: "1rem",
        background:
          safetyStats?.color === "#4caf50"
            ? "rgba(76,175,80,0.08)"
            : safetyStats?.color === "#ff9800"
              ? "rgba(255,152,0,0.08)"
              : safetyStats?.color === "#f44336"
                ? "rgba(244,67,54,0.08)"
                : "#f5f5f5",
        border: `2px solid ${safetyStats?.color || "#757575"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ fontSize: "2.5rem" }}>
          {safetyStats?.expiredCount > 0
            ? "❌"
            : safetyStats?.incompleteCount > 0
              ? "⚠️"
              : "✅"}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: "0 0 0.5rem 0", color: safetyStats?.color }}>
            {safetyStats?.expiredCount > 0
              ? "❌ Cannot Donate - Unsafe Items Detected"
              : safetyStats?.incompleteCount > 0
                ? "⚠️ Incomplete Items"
                : "✅ All Items Ready for Donation"}
                
          </h4>
          <p
            style={{
              margin: "0 0 0.75rem 0",
              fontSize: "1rem",
              fontWeight: "500",
              color: safetyStats?.color,
            }}
          >
            {safetyStats?.message}
          </p>

          {/* Item Status Breakdown */}
          {items && items.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {safetyStats?.safeCount > 0 && (
                <div
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    background: "#e8f5e9",
                    color: "#4caf50",
                  }}
                >
                  ✅ Safe: {safetyStats.safeCount}
                </div>
              )}
              {safetyStats?.incompleteCount > 0 && (
                <div
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    background: "#fff3e0",
                    color: "#ff9800",
                  }}
                >
                  ⚠️ Incomplete: {safetyStats.incompleteCount}
                </div>
              )}
              {safetyStats?.expiredCount > 0 && (
                <div
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    background: "#ffebee",
                    color: "#f44336",
                  }}
                >
                  ❌ Unsafe: {safetyStats.expiredCount}
                </div>
              )}
            </div>
          )}
        </div>
        
      </div>

      {safetyStats?.expiredCount > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "rgba(244,67,54,0.15)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <strong style={{ color: "#f44336" }}>
            ⚠️ Please remove unsafe items before donating. They cannot be
            accepted.
          </strong>
        </div>
      )}

      {safetyStats?.incompleteCount > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "rgba(255,152,0,0.15)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <strong style={{ color: "#ff9800" }}>
            ⚠️ Please complete all required fields before donating.
          </strong>
        </div>
      )}
    </div>
  );
};

// Main AddDonation Component with Multi-Item Support
const AddDonation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [donationItems, setDonationItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pickupDeadline, setPickupDeadline] = useState("");
  const [itemSafetyStatus, setItemSafetyStatus] = useState({});

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedItems = sessionStorage.getItem("donationItems");
    const savedDeadline = sessionStorage.getItem("pickupDeadline");

    if (savedItems) {
      try {
        const parsedItems = JSON.parse(savedItems);
        const itemsWithPreviews = parsedItems.map((item) => ({
          ...item,
          imageFile: null,
          imagePreview: null,
          scanData: item.scanData || null,
          // Ensure cooked food doesn't have expiry date
          ...(item.foodType === "cooked" && { expiryDate: null }),
        }));
        setDonationItems(itemsWithPreviews);
      } catch (e) {
        console.error("Error parsing saved items:", e);
      }
    }

    if (savedDeadline) {
      setPickupDeadline(savedDeadline);
    }
  }, []);

  // Load from navigation state
  useEffect(() => {
    if (location.state?.donationItems) {
      const items = location.state.donationItems.map((item) => ({
        ...item,
        ...(item.foodType === "cooked" && { expiryDate: null }),
      }));
      setDonationItems(items);
      sessionStorage.setItem("donationItems", JSON.stringify(items));
    }
    if (location.state?.pickupDeadline) {
      setPickupDeadline(location.state.pickupDeadline);
      sessionStorage.setItem("pickupDeadline", location.state.pickupDeadline);
    }

    if (location.state) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate]);

  // Auto-save to sessionStorage
  useEffect(() => {
    if (donationItems.length > 0) {
      const itemsToSave = donationItems.map(
        ({ imageFile, imagePreview, ...rest }) => rest,
      );
      sessionStorage.setItem("donationItems", JSON.stringify(itemsToSave));
    } else {
      sessionStorage.removeItem("donationItems");
    }
  }, [donationItems]);

  useEffect(() => {
    if (pickupDeadline) {
      sessionStorage.setItem("pickupDeadline", pickupDeadline);
    } else {
      sessionStorage.removeItem("pickupDeadline");
    }
  }, [pickupDeadline]);

  const addNewItem = () => {
    setDonationItems([
      ...donationItems,
      {
        id: Date.now() + Math.random(),
        foodType: "packaged",
        foodName: "",
        quantity: "",
        unit: "pieces",
        brandName: "",
        manufactureDate: "",
        expiryDate: "",
        mealType: "",
        preparationTime: "",
        ingredients: "",
        storageInstructions: "",
        imageFile: null,
        imagePreview: null,
        scanData: null,
      },
    ]);
  };

  const updateItem = (index, updatedItem) => {
    const newItems = [...donationItems];
    // For cooked food, ensure expiryDate is null
    if (updatedItem.foodType === "cooked") {
      updatedItem.expiryDate = null;
    }
    newItems[index] = updatedItem;
    setDonationItems(newItems);
  };

  const removeItem = (index) => {
    const newItems = donationItems.filter((_, i) => i !== index);
    setDonationItems(newItems);

    const newSafetyStatus = { ...itemSafetyStatus };
    delete newSafetyStatus[index];
    setItemSafetyStatus(newSafetyStatus);

    if (newItems.length === 0) {
      sessionStorage.removeItem("donationItems");
    }
  };

  const handleSafetyChange = (index, safety) => {
    setItemSafetyStatus((prev) => ({
      ...prev,
      [index]: safety,
    }));
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Get counts based on food type
  const getItemStats = () => {
    let total = donationItems.length;
    let safe = 0;
    let pending = 0;
    let expired = 0;
    let incomplete = 0;

    donationItems.forEach((item, index) => {
      const safety = itemSafetyStatus[index];

      if (item.foodType === "cooked") {
        // Cooked food: needs preparation time and meal type
        if (!item.preparationTime || !item.mealType) {
          incomplete++;
          pending++;
        } else if (safety?.canDonate === true) {
          safe++;
        } else if (safety?.canDonate === false) {
          expired++;
        } else {
          pending++;
        }
      } else {
        // Packaged food: needs expiry date and not expired
        if (!item.expiryDate) {
          incomplete++;
          pending++;
        } else if (isProductExpired(item.expiryDate)) {
          expired++;
        } else {
          safe++;
        }
      }
    });

    return { total, safe, pending, expired, incomplete };
  };

  const stats = getItemStats();
  const canDonate =
    stats.safe === stats.total && stats.total > 0 && stats.incomplete === 0;

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (donationItems.length === 0) {
        throw new Error("Please add at least one donation item");
      }

      // Validate each item based on food type
      for (const item of donationItems) {
        if (!item.foodName || !item.quantity) {
          throw new Error(
            "Please fill all required fields (Food Name and Quantity) for each item",
          );
        }

        if (item.foodType === "cooked") {
          if (!item.mealType) {
            throw new Error(
              `Please select meal type for "${item.foodName || "item"}"`,
            );
          }
          if (!item.preparationTime) {
            throw new Error(
              `Please enter preparation time for "${item.foodName || "item"}"`,
            );
          }
          // Check if cooked food is still safe
          const safety = itemSafetyStatus[donationItems.indexOf(item)];
          if (safety?.canDonate === false) {
            throw new Error(
              `"${item.foodName}" was prepared too long ago and is not safe for donation`,
            );
          }
        } else {
          if (!item.expiryDate) {
            throw new Error(
              `Please enter expiry date for "${item.foodName || "item"}"`,
            );
          }
          if (isProductExpired(item.expiryDate)) {
            throw new Error(
              `"${item.foodName}" is expired and cannot be donated`,
            );
          }
        }
      }

      if (!pickupDeadline) {
        throw new Error("Please set a pickup deadline");
      }

      const formDataToSend = new FormData();

      const itemsData = donationItems.map((item) => ({
        foodType: item.foodType,
        foodName: item.foodName,
        quantity: parseInt(item.quantity),
        unit: item.unit || "pieces",
        brandName: item.brandName || "",
        manufactureDate: item.manufactureDate || null,
        expiryDate: item.foodType === "packaged" ? item.expiryDate : null,
        mealType: item.mealType || null,
        preparationTime: item.preparationTime || null,
        ingredients: item.ingredients || null,
        storageInstructions: item.storageInstructions || null,
        scanData: item.scanData
          ? {
              brandName: item.scanData.brandName,
              manufactureDate: item.scanData.manufactureDate,
              expiryDate: item.scanData.expiryDate,
            }
          : null,
      }));

      formDataToSend.append("items", JSON.stringify(itemsData));
      formDataToSend.append("pickupDeadline", pickupDeadline);

      donationItems.forEach((item, index) => {
        if (item.imageFile) {
          formDataToSend.append("images", item.imageFile);
        }
      });

      const response = await axios.post("/api/donations/bulk", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      sessionStorage.removeItem("donationItems");
      sessionStorage.removeItem("pickupDeadline");

      setSuccess(`${donationItems.length} item(s) donated successfully!`);
      setDonationItems([]);
      setPickupDeadline("");
      setItemSafetyStatus({});

      setTimeout(() => {
        navigate("/donor/history");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create donation",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: "1.5rem" }}>Add New Donation</h2>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(244, 67, 54, 0.1)",
            border: "1px solid var(--error)",
            borderRadius: "8px",
            color: "var(--error)",
            marginBottom: "1rem",
            fontWeight: "500",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(76, 175, 80, 0.1)",
            border: "1px solid var(--success)",
            borderRadius: "8px",
            color: "var(--success)",
            marginBottom: "1rem",
            fontWeight: "500",
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {donationItems.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: "3rem" }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📦</div>
            <h3>No Items Added Yet</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              Click the button below to start adding donation items
            </p>
            <button
              type="button"
              onClick={addNewItem}
              className="btn btn-primary"
              style={{ fontSize: "1.1rem", padding: "0.75rem 2rem" }}
            >
              ➕ Add First Item
            </button>
          </div>
        ) : (
          <>
           
            {/* Render all donation items */}
            {donationItems.map((item, index) => (
              <DonationItem
                key={item.id}
                item={item}
                index={index}
                onUpdate={updateItem}
                onRemove={removeItem}
                onSafetyChange={handleSafetyChange}
              />
            ))}

            {/* Add Another Item Button */}
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <button
                type="button"
                onClick={addNewItem}
                className="btn"
                style={{
                  border: "2px dashed var(--accent)",
                  background: "transparent",
                  color: "var(--accent)",
                  padding: "0.75rem 2rem",
                  cursor: "pointer",
                }}
              >
                ➕ Add Another Item
              </button>
            </div>

            {/* Pickup Deadline */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "1rem" }}>Pickup Details</h4>
              <div className="form-group">
                <label>Pickup Deadline *</label>
                <input
                  type="datetime-local"
                  value={pickupDeadline}
                  onChange={(e) => setPickupDeadline(e.target.value)}
                  required
                  min={getMinDateTime()}
                  style={{ width: "100%" }}
                />
                <small
                  style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}
                >
                  Set when all items need to be picked up
                </small>
              </div>
            </div>

            {/* Pickup Location Section */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "1rem" }}>📍 Pickup Location</h4>
              <p
                style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}
              >
                Your profile address will be used for pickup.
                <Link
                  to="/donor/profile"
                  state={{
                    from: "/donor/add-donation",
                    donationItems: donationItems,
                    pickupDeadline: pickupDeadline,
                  }}
                  style={{ color: "var(--primary)", marginLeft: "0.5rem" }}
                >
                  Edit profile
                </Link>
                to change location.
              </p>
            </div>

            {/* AI Safety Analysis */}
            <AIAnalysisDisplay
              items={donationItems}
              itemSafetyStatus={itemSafetyStatus}
            />

            {/* Summary and Submit */}
            <div
              className="card"
              style={{
                background: canDonate
                  ? "linear-gradient(135deg, #4caf50 0%, #45a049 100%)"
                  : stats.expired > 0
                    ? "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)"
                    : "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                color: "white",
                marginTop: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <h4 style={{ margin: 0, color: "white" }}>Ready to Donate</h4>
                  <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9 }}>
                    You're donating {stats.total} item(s)
                  </p>
                  {stats.expired > 0 && (
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.8rem",
                        opacity: 0.9,
                      }}
                    >
                      ❌ {stats.expired} unsafe item(s) must be removed
                    </p>
                  )}
                  {stats.incomplete > 0 && (
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.8rem",
                        opacity: 0.9,
                      }}
                    >
                      ⚠️ {stats.incomplete} item(s) need information
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn"
                  disabled={loading || !canDonate}
                  style={{
                    background: "white",
                    color: canDonate ? "#4caf50" : "#999",
                    fontWeight: "600",
                    padding: "0.75rem 2rem",
                    border: "none",
                    cursor: loading || !canDonate ? "not-allowed" : "pointer",
                  }}
                >
                  {loading
                    ? "Processing..."
                    : stats.expired > 0
                      ? `Remove ${stats.expired} Unsafe Item(s)`
                      : stats.incomplete > 0
                        ? `Complete ${stats.incomplete} Item(s)`
                        : `Donate ${stats.safe} Item${stats.safe !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

// Donation History Component
const DonationHistory = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [pickupIdInput, setPickupIdInput] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await axios.get("/api/donations/my-donations");
      setDonations(response.data.donations);
    } catch (error) {
      console.error("Error fetching donations:", error);
    }
  };

  const openVerifyModal = (donation) => {
    setSelectedDonation(donation);
    setPickupIdInput("");
    setVerifyMessage({ type: "", text: "" });
    setShowVerifyModal(true);
  };

  const handleVerifyPickup = async () => {
    if (!pickupIdInput.trim()) {
      setVerifyMessage({ type: "error", text: "Please enter the Pickup ID" });
      return;
    }

    setVerifyLoading(true);
    setVerifyMessage({ type: "", text: "" });

    try {
      const response = await axios.post(
        `/api/donations/verify-pickup/${selectedDonation._id}`,
        {
          pickupId: pickupIdInput.trim(),
        },
      );

      setVerifyMessage({
        type: "success",
        text: "✅ Pickup verified successfully!",
      });

      setTimeout(() => {
        setShowVerifyModal(false);
        fetchDonations();
      }, 2000);
    } catch (error) {
      setVerifyMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to verify pickup",
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: "1.5rem" }}>My Donations</h2>

      {donations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p>No donations yet. Start by adding your first donation!</p>
          <Link
            to="/donor/add-donation"
            className="btn btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Add Donation
          </Link>
        </div>
      ) : (
        <div className="grid">
          {donations.map((donation) => {
            const isExpired =
              donation.foodType === "packaged" &&
              donation.expiryDate &&
              new Date(donation.expiryDate) < new Date();
            return (
              <div
                key={donation._id}
                className="card"
                style={{ borderLeft: isExpired ? "4px solid #f44336" : "none" }}
              >
                <div className="card-header">
                  <h4 className="card-title">{donation.foodName}</h4>
                  <span
                    className={`card-badge badge-${donation.status === "pending" ? "pending" : donation.status === "accepted" ? "accepted" : donation.status === "picked_up" ? "picked" : "rejected"}`}
                  >
                    {donation.status}
                  </span>
                </div>
                <div className="food-details">
                  <div className="food-detail-item">
                    <span>📦</span>
                    <span>
                      {donation.quantity} {donation.unit}
                    </span>
                  </div>
                  <div className="food-detail-item">
                    <span>🍽️</span>
                    <span>
                      {donation.foodType === "cooked" ? "Cooked" : "Packaged"}
                    </span>
                  </div>
                </div>

                {donation.foodType === "packaged" && donation.expiryDate && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.5rem",
                      borderRadius: "4px",
                      background: isExpired ? "#ffebee" : "#e8f5e9",
                      color: isExpired ? "#f44336" : "#4caf50",
                      fontSize: "0.85rem",
                    }}
                  >
                    {isExpired
                      ? "❌ Expired"
                      : `✅ Expires: ${new Date(donation.expiryDate).toLocaleDateString()}`}
                  </div>
                )}

                {donation.foodType === "cooked" && donation.preparationTime && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.5rem",
                      borderRadius: "4px",
                      background: "#e3f2fd",
                      color: "#1976d2",
                      fontSize: "0.85rem",
                    }}
                  >
                    🍲 Prepared:{" "}
                    {new Date(donation.preparationTime).toLocaleString()}
                  </div>
                )}

                {donation.status === "accepted" && donation.pickupId && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background:
                        "linear-gradient(135deg, #FF6F00 0%, #FF8F00 100%)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                  >
                    <p style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                      Pickup ID
                    </p>
                    <p
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        letterSpacing: "2px",
                      }}
                    >
                      {donation.pickupId}
                    </p>
                    <button
                      onClick={() => openVerifyModal(donation)}
                      className="btn"
                      style={{
                        marginTop: "0.75rem",
                        width: "100%",
                        background: "white",
                        color: "#FF6F00",
                        fontWeight: "600",
                      }}
                    >
                      🔐 Verify & Complete Pickup
                    </button>
                  </div>
                )}

                {donation.status === "picked_up" && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "rgba(76, 175, 80, 0.1)",
                      borderRadius: "8px",
                      border: "1px solid var(--success)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "var(--success)",
                      }}
                    >
                      ✅ Completed
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showVerifyModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            style={{
              background:"rgba(75, 67, 67, 1)",
              padding: "2rem",
              borderRadius: "16px",
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>🔐 Verify Pickup</h3>
            <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
              Enter the Pickup ID from the receiver to verify and complete the
              donation.
            </p>

            <div className="form-group">
              <label>Enter Pickup ID</label>
              <input
                type="text"
                value={pickupIdInput}
                onChange={(e) => setPickupIdInput(e.target.value.toUpperCase())}
                placeholder="Enter pickup ID"
                style={{
                  fontSize: "1.2rem",
                  letterSpacing: "2px",
                  textAlign: "center",
                  width: "100%",
                }}
              />
            </div>

            {verifyMessage.text && (
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  background:
                    verifyMessage.type === "success"
                      ? "rgba(76, 175, 80, 0.1)"
                      : "rgba(244, 67, 54, 0.1)",
                  color:
                    verifyMessage.type === "success"
                      ? "var(--success)"
                      : "var(--error)",
                }}
              >
                {verifyMessage.text}
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="btn"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPickup}
                className="btn btn-primary"
                disabled={verifyLoading}
                style={{ flex: 1 }}
              >
                {verifyLoading ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Donation Component
const EditDonation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    foodType: "packaged",
    foodName: "",
    quantity: "",
    unit: "pieces",
    brandName: "",
    manufactureDate: "",
    expiryDate: "",
    mealType: "",
    preparationTime: "",
    pickupDeadline: "",
    description: "",
  });

  useEffect(() => {
    fetchDonation();
  }, [id]);

  const fetchDonation = async () => {
    try {
      const response = await axios.get(`/api/donations/${id}`);
      const donation = response.data.donation;

      const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        return d.toISOString().split("T")[0];
      };

      const formatDateTime = (date) => {
        if (!date) return "";
        return new Date(date).toISOString().slice(0, 16);
      };

      setFormData({
        foodType: donation.foodType || "packaged",
        foodName: donation.foodName || "",
        quantity: donation.quantity || "",
        unit: donation.unit || "pieces",
        brandName: donation.brandName || "",
        manufactureDate: formatDate(donation.manufactureDate),
        expiryDate:
          donation.foodType === "packaged"
            ? formatDate(donation.expiryDate)
            : "",
        mealType: donation.mealType || "",
        preparationTime: donation.preparationTime || "",
        pickupDeadline: formatDateTime(donation.pickupDeadline),
        description: donation.description || "",
      });

      setLoading(false);
    } catch (err) {
      setError("Failed to load donation");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if packaged product is expired before allowing edit
    if (
      formData.foodType === "packaged" &&
      formData.expiryDate &&
      isProductExpired(formData.expiryDate)
    ) {
      setError(
        "Cannot edit expired donation. Please create a new donation for non-expired items.",
      );
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await axios.put(`/api/donations/${id}`, formData);
      setSuccess("Donation updated successfully!");
      setTimeout(() => {
        navigate("/donor/history");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update donation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const isExpired =
    formData.foodType === "packaged" &&
    formData.expiryDate &&
    isProductExpired(formData.expiryDate);

  return (
    <div>
      <h2 style={{ marginBottom: "1.5rem" }}>Edit Donation</h2>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(244, 67, 54, 0.1)",
            border: "1px solid var(--error)",
            borderRadius: "8px",
            color: "var(--error)",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(76, 175, 80, 0.1)",
            border: "1px solid var(--success)",
            borderRadius: "8px",
            color: "var(--success)",
            marginBottom: "1rem",
          }}
        >
          {success}
        </div>
      )}

      {isExpired && (
        <div
          style={{
            padding: "1rem",
            background: "#0e0d0dff",
            border: "1px solid #f44336",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          <strong style={{ color: "#f44336" }}>
            ⚠️ This product has expired and cannot be donated.
          </strong>
          <p style={{ marginTop: "0.5rem" }}>
            <Link
              to="/donor/add-donation"
              className="btn"
              style={{ background: "#4caf50", color: "white" }}
            >
              Create New Donation
            </Link>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ marginBottom: "1rem" }}>Food Type</h4>
          <div className="tabs">
            <button
              type="button"
              className={`tab ${formData.foodType === "packaged" ? "active" : ""}`}
              onClick={() =>
                setFormData({
                  ...formData,
                  foodType: "packaged",
                  expiryDate: "",
                  preparationTime: "",
                })
              }
              disabled={isExpired}
            >
              📦 Packaged Food
            </button>
            <button
              type="button"
              className={`tab ${formData.foodType === "cooked" ? "active" : ""}`}
              onClick={() =>
                setFormData({ ...formData, foodType: "cooked", expiryDate: "" })
              }
              disabled={isExpired}
            >
              🍲 Cooked Food
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ marginBottom: "1rem" }}>Food Details</h4>

          <div className="form-row">
            <div className="form-group">
              <label>Food Name *</label>
              <input
                type="text"
                name="foodName"
                value={formData.foodName}
                onChange={handleChange}
                required
                disabled={isExpired}
                placeholder="e.g., Biscuits, Rice, Curry"
              />
            </div>
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="1"
                disabled={isExpired}
                placeholder="Number of items"
              />
            </div>
          </div>

          {formData.foodType === "packaged" && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    name="brandName"
                    value={formData.brandName}
                    onChange={handleChange}
                    disabled={isExpired}
                    placeholder="Brand name"
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    disabled={isExpired}
                  >
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kg</option>
                    <option value="liters">Liters</option>
                    <option value="packs">Packs</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Manufacture Date (MFD)</label>
                  <input
                    type="date"
                    name="manufactureDate"
                    value={formData.manufactureDate}
                    onChange={handleChange}
                    disabled={isExpired}
                  />
                </div>
                <div className="form-group">
                  <label>Expiry Date (EXP) *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    required
                    disabled={isExpired}
                    style={{ borderColor: isExpired ? "#f44336" : "#0e0d0dff" }}
                  />
                  {isExpired && (
                    <small style={{ color: "#f44336" }}>
                      ❌ This product has expired
                    </small>
                  )}
                </div>
              </div>

            </>
          )}

          {formData.foodType === "cooked" && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Meal Type *</label>
                  <select
                    name="mealType"
                    value={formData.mealType}
                    onChange={handleChange}
                    required
                    disabled={isExpired}
                  >
                    <option value="">Select meal type</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Preparation Time *</label>
                  <input
                    type="datetime-local"
                    name="preparationTime"
                    value={formData.preparationTime}
                    onChange={handleChange}
                    required
                    disabled={isExpired}
                  />
                  <small style={{ fontSize: "0.7rem", color: "#666" }}>
                    When was the food prepared?
                  </small>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={isExpired}
              placeholder="Additional details about the food"
            />
          </div>

          <div className="form-group">
            <label>Pickup Deadline</label>
            <input
              type="datetime-local"
              name="pickupDeadline"
              value={formData.pickupDeadline}
              onChange={handleChange}
              disabled={isExpired}
            />
          </div>
        </div>

        {!isExpired && (
          <>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn"
              style={{ marginLeft: "1rem" }}
              onClick={() => navigate("/donor/history")}
            >
              Cancel
            </button>
          </>
        )}
      </form>
    </div>
  );
};

// Donor Profile Component
const DonorProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [location_, setLocation_] = useState(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    organizationName: user?.organizationName || "",
    street: user?.address?.street || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zipCode: user?.address?.zipCode || "",
    landmark: user?.address?.landmark || "",
    lat: user?.address?.location?.lat || "",
    lng: user?.address?.location?.lng || "",
  });

  useEffect(() => {
    if (user?.address?.location) {
      setLocation_({
        lat: user.address.location.lat,
        lng: user.address.location.lng,
        fullAddress: `${user.address.street || ""}, ${user.address.city || ""}, ${user.address.state || ""}`,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationChange = (loc) => {
    setLocation_(loc);
    setFormData((prev) => ({
      ...prev,
      street: loc.street || prev.street,
      city: loc.city || prev.city,
      state: loc.state || prev.state,
      zipCode: loc.zipCode || prev.zipCode,
      landmark: loc.landmark || prev.landmark,
      lat: loc.lat || "",
      lng: loc.lng || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.put("/api/auth/profile", formData);
      setUser(response.data.user);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);

      if (location.state?.from === "/donor/add-donation") {
        setTimeout(() => {
          navigate("/donor/add-donation", {
            state: {
              donationItems: location.state.donationItems,
              pickupDeadline: location.state.pickupDeadline,
            },
          });
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const hasLocation =
    user?.address?.location?.lat && user?.address?.location?.lng;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2>My Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary"
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {success && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(76, 175, 80, 0.1)",
            border: "1px solid var(--success)",
            borderRadius: "8px",
            color: "var(--success)",
            marginBottom: "1rem",
          }}
        >
          {success}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(244, 67, 54, 0.1)",
            border: "1px solid var(--error)",
            borderRadius: "8px",
            color: "var(--error)",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {!hasLocation && !isEditing && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(255, 111, 0, 0.1)",
            border: "1px solid var(--accent)",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "var(--accent)", fontWeight: "500" }}>
            ⚠️ Your location is not set! Click "Edit Profile" below to add your
            address and location.
          </p>
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "2rem",
            }}
          >
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h3>{user?.name}</h3>
            <p style={{ color: "var(--text-secondary)" }}>
              {user?.organizationName}
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              ID: {user?.uniqueId}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={user?.email} disabled />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={user?.phone} disabled />
              </div>
            </div>

            <div className="form-group">
              <label>Organization Type</label>
              <input type="text" value={user?.organizationType} disabled />
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                value={
                  user?.address
                    ? `${user.address.street || ""}, ${user.address.city || ""}, ${user.address.state || ""} ${user.address.zipCode || ""}`
                    : "Not set"
                }
                disabled
              />
            </div>

            {user?.address?.landmark && (
              <div className="form-group">
                <label>Landmark</label>
                <input type="text" value={user.address.landmark} disabled />
              </div>
            )}

            {hasLocation && (
              <div className="form-group">
                <label>📍 Location</label>
                <div
                  style={{
                    padding: "0.75rem",
                    background: "rgba(76, 175, 80, 0.1)",
                    borderRadius: "8px",
                    border: "1px solid var(--success)",
                  }}
                >
                  ✅ Location set ({user.address.location.lat.toFixed(4)},{" "}
                  {user.address.location.lng.toFixed(4)})
                </div>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Organization Name</label>
              <input
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>📍 Your Location (Required for pickup)</label>
              <LocationPicker
                value={location_}
                onChange={handleLocationChange}
                label="Select Your Location"
              />
              {location_ && location_.fullAddress && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    background: "rgba(76, 175, 80, 0.1)",
                    borderRadius: "8px",
                    border: "1px solid var(--success)",
                  }}
                >
                  ✅ Location confirmed: {location_.fullAddress}
                </div>
              )}
            </div>

            {location_ && (
              <div style={{ marginTop: "1.5rem", animation: "fadeIn 0.5s ease-out" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="form-group">
                    <label>Street Address <span style={{ color: "red" }}>*</span></label>
                    <input 
                      type="text" 
                      name="street" 
                      value={formData.street} 
                      onChange={handleChange} 
                      placeholder="House No, Building, Street Name"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Landmark <span style={{ color: "red" }}>*</span></label>
                    <input 
                      type="text" 
                      name="landmark" 
                      value={formData.landmark} 
                      onChange={handleChange} 
                      placeholder="e.g. Near City Mall"
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="form-group">
                    <label>City <span style={{ color: "red" }}>*</span></label>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange} 
                      placeholder="City"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>State <span style={{ color: "red" }}>*</span></label>
                    <input 
                      type="text" 
                      name="state" 
                      value={formData.state} 
                      onChange={handleChange} 
                      placeholder="State"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Zip Code <span style={{ color: "red" }}>*</span></label>
                    <input 
                      type="text" 
                      name="zipCode" 
                      value={formData.zipCode} 
                      onChange={handleChange} 
                      placeholder="Zip Code"
                      required 
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Saving..." : "💾 Save Changes"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Main DonorDashboard Component
const DonorDashboard = () => {
  return (
    <div className="dashboard">
      <DonorSidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<DonorHome />} />
          <Route path="/add-donation" element={<AddDonation />} />
          <Route path="/edit-donation/:id" element={<EditDonation />} />
          <Route path="/history" element={<DonationHistory />} />
          <Route path="/profile" element={<DonorProfile />} />
        </Routes>
      </div>
    </div>
  );
};

export default DonorDashboard;
