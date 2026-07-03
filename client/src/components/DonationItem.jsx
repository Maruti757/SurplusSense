// DonationItem.jsx - Individual donation item component with proper handling for cooked food
import { useState, useEffect } from "react";
import axios from "axios";

// Helper to convert date to YYYY-MM-DD format for input fields
const convertToDateInputFormat = (dateStr) => {
  if (!dateStr) return "";

  if (dateStr.includes("-") && dateStr.split("-").length === 3) {
    return dateStr;
  }

  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    if (parts.length === 2) {
      const [month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-01`;
    }
  }

  if (dateStr.includes("-") && dateStr.split("-").length === 2) {
    const [month, year] = dateStr.split("-");
    return `${year}-${month.padStart(2, "0")}-01`;
  }

  return dateStr;
};

// Helper to format date for display
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

// Helper to calculate hours since preparation for cooked food
const getHoursSincePreparation = (preparationTime) => {
  if (!preparationTime) return null;
  try {
    const prepared = new Date(preparationTime);
    const now = new Date();
    if (isNaN(prepared.getTime())) return null;
    const diffMs = now - prepared;
    return diffMs / (1000 * 60 * 60);
  } catch {
    return null;
  }
};

// Helper to calculate days until expiry (only for packaged food)
const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (isNaN(expiry.getTime())) return null;
    const timeDiff = expiry - currentDate;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

// Helper to check if packaged product is expired
const isProductExpired = (expiryDate) => {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  return daysUntilExpiry !== null && daysUntilExpiry < 0;
};

// AI Analysis for Cooked Food (no expiry dates)
const analyzeCookedFood = (preparationTime, mealType, foodName) => {
  if (!preparationTime) {
    return {
      isValid: false,
      status: "pending",
      label: "⚠️ NEEDS PREPARATION TIME",
      color: "#ff9800",
      bgColor: "#fff3e0",
      canDonate: false,
      message: "Please enter preparation time to check safety",
      safetyScore: 0,
      hoursSincePrep: null,
    };
  }

  const hoursSincePrep = getHoursSincePreparation(preparationTime);

  if (hoursSincePrep === null) {
    return {
      isValid: false,
      status: "invalid",
      label: "❌ INVALID TIME",
      color: "#f44336",
      bgColor: "#050505ff",
      canDonate: false,
      message: "Invalid preparation time format",
      safetyScore: 0,
      hoursSincePrep: null,
    };
  }

  if (hoursSincePrep < 0) {
    return {
      isValid: false,
      status: "future",
      label: "⚠️ FUTURE DATE",
      color: "#ff9800",
      bgColor: "#090908ff",
      canDonate: false,
      message: "Preparation time cannot be in the future",
      safetyScore: 0,
      hoursSincePrep: hoursSincePrep,
    };
  }

  // Safety rules based on hours since preparation
  let status, label, color, bgColor, canDonate, message, safetyScore;

  if (hoursSincePrep <= 2) {
    status = "fresh";
    label = "✅ FRESHLY PREPARED";
    color = "#4caf50";
    bgColor = "#e8f5e9";
    canDonate = true;
    message = `Prepared ${Math.round(hoursSincePrep)} hour(s) ago - Excellent condition for donation`;
    safetyScore = 100;
  } else if (hoursSincePrep <= 4) {
    status = "safe";
    label = "✅ SAFE FOR DONATION";
    color = "#8bc34a";
    bgColor = "#f1f8e9";
    canDonate = true;
    message = `Prepared ${Math.round(hoursSincePrep)} hour(s) ago - Still safe, donate soon`;
    safetyScore = 85;
  } else if (hoursSincePrep <= 6) {
    status = "caution";
    label = "⚠️ DONATE IMMEDIATELY";
    color = "#ff9800";
    bgColor = "#fff3e0";
    canDonate = true;
    message = `Prepared ${Math.round(hoursSincePrep)} hour(s) ago - Donate immediately, may spoil soon`;
    safetyScore = 60;
  } else if (hoursSincePrep <= 8) {
    status = "risky";
    label = "⚠️ RISKY - NOT RECOMMENDED";
    color = "#f44336";
    bgColor = "#ffebee";
    canDonate = false;
    message = `Prepared ${Math.round(hoursSincePrep)} hour(s) ago - May not be safe for consumption`;
    safetyScore = 30;
  } else {
    status = "unsafe";
    label = "❌ UNSAFE - TOO OLD";
    color = "#d32f2f";
    bgColor = "#ffebee";
    canDonate = false;
    message = `Prepared ${Math.round(hoursSincePrep)} hour(s) ago - Not safe for donation`;
    safetyScore = 0;
  }

  // Adjust safety score based on meal type (sensitive items)
  if (mealType) {
    const sensitiveMeals = ["Dessert", "Dairy"];
    if (sensitiveMeals.includes(mealType) && hoursSincePrep > 3) {
      safetyScore = Math.max(0, safetyScore - 20);
      if (status !== "unsafe" && status !== "risky") {
        message += " (Dairy/egg items spoil faster)";
      }
    }
  }

  return {
    isValid: canDonate,
    status: status,
    label: label,
    color: color,
    bgColor: bgColor,
    canDonate: canDonate,
    message: message,
    safetyScore: safetyScore,
    hoursSincePrep: hoursSincePrep,
  };
};

// Helper to get safety status based on food type
const getSafetyStatus = (
  expiryDate,
  foodType = "packaged",
  cookedAnalysis = null,
) => {
  // For cooked food - NO EXPIRY DATE CHECK
  if (foodType === "cooked") {
    if (cookedAnalysis) {
      return {
        status: cookedAnalysis.status,
        label: cookedAnalysis.label,
        color: cookedAnalysis.color,
        bgColor: cookedAnalysis.bgColor,
        canDonate: cookedAnalysis.canDonate,
        message: cookedAnalysis.message,
        safetyScore: cookedAnalysis.safetyScore,
        hoursSincePrep: cookedAnalysis.hoursSincePrep,
      };
    }
    return {
      status: "pending",
      label: "⏳ NEEDS PREPARATION TIME",
      color: "#9e9e9e",
      bgColor: "#f5f5f5",
      canDonate: false,
      message: "Please enter preparation time to check safety",
    };
  }

  // For packaged food - Check expiry date
  if (!expiryDate) {
    return {
      status: "unknown",
      label: "⚠️ No Expiry Date",
      color: "#ff9800",
      bgColor: "#fff3e0",
      canDonate: false,
      message: "Please enter expiry date to check safety",
    };
  }

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

  if (daysUntilExpiry < 0) {
    return {
      status: "expired",
      label: "❌ EXPIRED",
      color: "#f44336",
      bgColor: "#ffebee",
      canDonate: false,
      message: `Expired ${Math.abs(daysUntilExpiry)} days ago - NOT SAFE FOR DONATION`,
    };
  }

  if (daysUntilExpiry === 0) {
    return {
      status: "expires_today",
      label: "⚠️ EXPIRES TODAY",
      color: "#ff9800",
      bgColor: "#fff3e0",
      canDonate: true,
      message: "Expires today - Donate immediately if still in good condition",
    };
  }

  if (daysUntilExpiry <= 7) {
    return {
      status: "expiring_soon",
      label: "⚠️ EXPIRING SOON",
      color: "#ff9800",
      bgColor: "#fff3e0",
      canDonate: true,
      message: `Expires in ${daysUntilExpiry} day(s) - Donate to organizations that can distribute quickly`,
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      status: "expiring_month",
      label: "⚠️ EXPIRES WITHIN 30 DAYS",
      color: "#ffc107",
      bgColor: "#fff8e1",
      canDonate: true,
      message: `Expires in ${daysUntilExpiry} day(s) - Still safe for donation`,
    };
  }

  return {
    status: "safe",
    label: "✅ SAFE FOR DONATION",
    color: "#4caf50",
    bgColor: "#e8f5e9",
    canDonate: true,
    message: `Expires in ${daysUntilExpiry} day(s) - Safe for donation`,
  };
};

const DonationItem = ({ item, onUpdate, onRemove, index, onSafetyChange }) => {
  const [scanning, setScanning] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState(null);
  const [cookedAnalysis, setCookedAnalysis] = useState(null);

  // Analyze cooked food whenever preparation time or meal type changes
  useEffect(() => {
    if (item.foodType === "cooked") {
      const analysis = analyzeCookedFood(
        item.preparationTime,
        item.mealType,
        item.foodName,
      );
      setCookedAnalysis(analysis);
    } else {
      setCookedAnalysis(null);
    }
  }, [item.preparationTime, item.mealType, item.foodType, item.foodName]);

  // Check safety based on food type
  useEffect(() => {
    const status = getSafetyStatus(
      item.expiryDate,
      item.foodType,
      cookedAnalysis,
    );
    setSafetyStatus(status);

    // Notify parent about safety status
    if (onSafetyChange) {
      onSafetyChange(index, {
        canDonate: status.canDonate,
        status: status.status,
        message: status.message,
        safetyScore: status.safetyScore,
      });
    }

    // Show warning for unsafe items
    const shouldShowWarning =
      (item.foodType === "packaged" && status.status === "expired") ||
      (item.foodType === "cooked" &&
        (status.status === "risky" || status.status === "unsafe"));

    setShowWarning(shouldShowWarning);
  }, [item.expiryDate, item.foodType, cookedAnalysis, index, onSafetyChange]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedItem = {
        ...item,
        imageFile: file,
        imagePreview: reader.result,
      };
      onUpdate(index, updatedItem);
    };
    reader.readAsDataURL(file);

    // Only scan for packaged food
    if (item.foodType === "packaged") {
      setScanning(true);

      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await axios.post("/api/ocr/scan-product", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.success) {
          const scanData = response.data.data;

          const manufactureDate = scanData.manufactureDate
            ? convertToDateInputFormat(scanData.manufactureDate)
            : item.manufactureDate || "";
          const expiryDate = scanData.expiryDate
            ? convertToDateInputFormat(scanData.expiryDate)
            : item.expiryDate || "";

          onUpdate(index, {
            ...item,
            imageFile: file,
            imagePreview: reader.result,
            scanData: scanData,
            brandName: scanData.brandName || item.brandName || "",
            manufactureDate: manufactureDate,
            expiryDate: expiryDate,
          });

          if (scanData.canDonate === false) {
            setTimeout(() => {
              alert(
                `⚠️ ${scanData.donationMessage || "This product is expired and cannot be donated!"}`,
              );
            }, 100);
          }
        }
      } catch (err) {
        console.error("Error scanning:", err);
        const errMsg = err.response?.data?.error || err.message || "Failed to scan product.";
        alert(
          `Image Scan Error: ${errMsg}\n\nPlease enter the date and brand details manually below.`
        );
      } finally {
        setScanning(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onUpdate(index, { ...item, [name]: value });
  };

  const handleFoodTypeChange = (foodType) => {
    const updatedItem = { ...item, foodType };

    if (foodType === "cooked") {
      // Clear packaged food fields, keep cooked food fields
      updatedItem.manufactureDate = "";
      updatedItem.expiryDate = "";
      updatedItem.brandName = "";
      updatedItem.mealType = updatedItem.mealType || "";
      updatedItem.preparationTime = updatedItem.preparationTime || "";
      updatedItem.ingredients = updatedItem.ingredients || "";
      updatedItem.storageInstructions = updatedItem.storageInstructions || "";
    } else {
      // Clear cooked food fields
      updatedItem.mealType = "";
      updatedItem.preparationTime = "";
      updatedItem.ingredients = "";
      updatedItem.storageInstructions = "";
    }

    onUpdate(index, updatedItem);
  };

  const handleManualCheck = () => {
    if (item.foodType === "cooked") {
      if (!item.preparationTime) {
        alert("Please enter preparation time first");
        return;
      }
      const analysis = analyzeCookedFood(
        item.preparationTime,
        item.mealType,
        item.foodName,
      );
      alert(
        `🍲 Cooked Food Safety Analysis:\n\n` +
          `${analysis.message}\n\n` +
          `Safety Score: ${analysis.safetyScore}/100\n` +
          `Hours Since Prep: ${Math.round(analysis.hoursSincePrep)} hour(s)\n\n` +
          `Recommendation: ${analysis.canDonate ? "✅ Safe to donate" : "❌ Not safe for donation"}\n\n` +
          `Note: Cooked food should be donated within 4 hours of preparation for best quality and safety.`,
      );
      return;
    }

    if (!item.expiryDate) {
      alert("Please enter an expiry date first");
      return;
    }

    const status = getSafetyStatus(item.expiryDate, item.foodType);
    alert(status.message);
  };

  return (
    <div
      className="card"
      style={{ marginBottom: "1.5rem", position: "relative" }}
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "rgba(6, 5, 4, 0.8)",
          border: "1px solid var(--error)",
          color: "var(--error)",
          borderRadius: "50%",
          width: "32px",
          height: "32px",
          cursor: "pointer",
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
        title="Remove item"
      >
        ×
      </button>

      <h4 style={{ marginBottom: "1rem", color: "var(--primary)" }}>
        Item #{index + 1}
      </h4>

      {/* Food Type Selection */}
      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "500",
          }}
        >
          Food Type *
        </label>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="button"
            onClick={() => handleFoodTypeChange("packaged")}
            style={{
              flex: 1,
              padding: "0.5rem",
              backgroundColor:
                item.foodType === "packaged" ? "var(--primary)" : "#f5f5f5",
              color: item.foodType === "packaged" ? "white" : "#666",
              border: "1px solid var(--primary)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            📦 Packaged Food
          </button>
          <button
            type="button"
            onClick={() => handleFoodTypeChange("cooked")}
            style={{
              flex: 1,
              padding: "0.5rem",
              backgroundColor:
                item.foodType === "cooked" ? "var(--accent)" : "#f5f5f5",
              color: item.foodType === "cooked" ? "white" : "#666",
              border: "1px solid var(--accent)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            🍲 Cooked Food
          </button>
        </div>
      </div>

      {/* Safety Status Banner */}
      {safetyStatus && (
        <div
          style={{
            padding: "12px",
            marginBottom: "1rem",
            borderRadius: "8px",
            backgroundColor: safetyStatus.bgColor,
            borderLeft: `4px solid ${safetyStatus.color}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: "bold", color: safetyStatus.color }}>
              {safetyStatus.label}
            </span>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "0.85rem",
                color: "#0e0d0dff",
              }}
            >
              {safetyStatus.message}
            </p>
            {safetyStatus.safetyScore !== undefined && (
              <div style={{ marginTop: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.7rem",
                  }}
                >
                  <span>Safety Score</span>
                  <span
                    style={{ fontWeight: "bold", color: safetyStatus.color }}
                  >
                    {safetyStatus.safetyScore}/100
                  </span>
                </div>
                <div
                  style={{
                    height: "4px",
                    background: "#0e0d0dff",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${safetyStatus.safetyScore}%`,
                      background: safetyStatus.color,
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleManualCheck}
            style={{
              padding: "4px 12px",
              fontSize: "0.75rem",
              backgroundColor: "transparent",
              border: `1px solid ${safetyStatus.color}`,
              borderRadius: "4px",
              cursor: "pointer",
              color: safetyStatus.color,
            }}
          >
            {item.foodType === "cooked" ? "Analyze" : "Check"}
          </button>
        </div>
      )}

      {/* Warning Banner for Unsafe Items */}
      {showWarning && (
        <div
          style={{
            padding: "12px",
            marginBottom: "1rem",
            borderRadius: "8px",
            backgroundColor: "#040404ff",
            border: "1px solid #f44336",
            color: "#c62828",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong>
                {item.foodType === "cooked"
                  ? "Unsafe Food Detected!"
                  : "Expired Product Detected!"}
              </strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>
                {item.foodType === "cooked"
                  ? `This food was prepared ${Math.round(cookedAnalysis?.hoursSincePrep)} hours ago and may not be safe for consumption.`
                  : "This product has expired and cannot be donated."}
              </p>
            </div>
            <button
              onClick={() => onRemove(index)}
              style={{
                padding: "4px 12px",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Remove Item
            </button>
          </div>
        </div>
      )}

      {/* Image Upload */}
      <div
        style={{
          padding: "1rem",
          border: item.imagePreview
            ? showWarning && item.foodType === "packaged"
              ? "2px solid #f44336"
              : "2px solid var(--success)"
            : "2px dashed #ddd",
          borderRadius: "8px",
          textAlign: "center",
          marginBottom: "1rem",
          position: "relative",
          cursor: "pointer",
          backgroundColor:
            showWarning && item.foodType === "packaged" ? "#ffebee" : "white",
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{
            position: "absolute",
            opacity: 0,
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            cursor: "pointer",
          }}
          id={`file-${index}`}
          disabled={scanning}
        />
        <label
          htmlFor={`file-${index}`}
          style={{ cursor: "pointer", display: "block" }}
        >
          {item.imagePreview ? (
            <img
              src={item.imagePreview}
              alt="Product"
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                borderRadius: "8px",
              }}
            />
          ) : (
            <div>
              <div style={{ fontSize: "3rem" }}>
                {item.foodType === "cooked" ? "🍲" : "📷"}
              </div>
              <p>Click to upload product image</p>
              {item.foodType === "packaged" && (
                <p
                  style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
                >
                  AI will extract MFD & EXP dates
                </p>
              )}
            </div>
          )}
        </label>
      </div>

      {/* Scanning Status */}
      {scanning && item.foodType === "packaged" && (
        <div
          style={{
            padding: "0.75rem",
            background: "rgba(0,172,193,0.1)",
            borderRadius: "8px",
            textAlign: "center",
            marginBottom: "1rem",
            color: "var(--accent)",
            fontWeight: "500",
          }}
        >
          <span style={{ fontSize: "1.2rem", marginRight: "0.5rem" }}>🔍</span>
          AI is scanning for dates...
        </div>
      )}

      {/* Scanned Data Display - Only for Packaged Food */}
      {item.foodType === "packaged" &&
        item.scanData &&
        (item.scanData.manufactureDate || item.scanData.expiryDate) && (
          <div
            style={{
              padding: "0.75rem",
              background:
                safetyStatus?.status === "expired"
                  ? "rgba(76,175,80,0.1)"
                  : "rgba(76,175,80,0.1)",
              borderRadius: "8px",
              marginBottom: "1rem",
              border: `1px solid ${safetyStatus?.status === "expired" ? "#f44336" : "var(--success)"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "space-around",
                alignItems: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.8rem",opacity: 0.8 }}>📅 MFD</div>
                <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                  {item.scanData.manufactureDate
                    ? formatDisplayDate(item.scanData.manufactureDate)
                    : "—"}
                </div>
              </div>
              <div style={{ fontSize: "1.5rem", opacity: 0.5 }}>→</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>⏰ EXP</div>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    color:
                      safetyStatus?.status === "expired"
                        ? "#f44336"
                        : "inherit",
                  }}
                >
                  {item.scanData.expiryDate
                    ? formatDisplayDate(item.scanData.expiryDate)
                    : "—"}
                </div>
              </div>
            </div>
            {item.expiryDate && (
              <div
                style={{
                  marginTop: "8px",
                  textAlign: "center",
                  fontSize: "0.8rem",
                  color:
                    getDaysUntilExpiry(item.expiryDate) < 0
                      ? "#f44336"
                      : "#4caf50",
                }}
              >
                {getDaysUntilExpiry(item.expiryDate) < 0
                  ? `Expired ${Math.abs(getDaysUntilExpiry(item.expiryDate))} days ago`
                  : `${getDaysUntilExpiry(item.expiryDate)} days until expiry`}
              </div>
            )}
          </div>
        )}

      {/* Item Details Form */}
      <div className="form-row">
        <div className="form-group">
          <label>Food Name *</label>
          <input
            type="text"
            name="foodName"
            value={item.foodName || ""}
            onChange={handleInputChange}
            required
            placeholder={
              item.foodType === "cooked"
                ? "e.g., Chicken Biryani, Vegetable Curry"
                : "e.g., Biscuits, Rice"
            }
          />
        </div>
        <div className="form-group">
          <label>Quantity *</label>
          <input
            type="number"
            name="quantity"
            value={item.quantity || ""}
            onChange={handleInputChange}
            required
            min="1"
            placeholder="Quantity"
          />
        </div>
      </div>

      {/* Packaged Food Specific Fields */}
      {item.foodType === "packaged" && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Brand Name</label>
              <input
                type="text"
                name="brandName"
                value={item.brandName || ""}
                onChange={handleInputChange}
                placeholder="Brand name"
              />
              {item.scanData?.brandName &&
                item.scanData.brandName !== "Unknown Brand" && (
                  <small
                    style={{
                      color: "var(--success)",
                      display: "block",
                      marginTop: "4px",
                    }}
                  >
                    ✅ Auto-detected: {item.scanData.brandName}
                  </small>
                )}
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select
                name="unit"
                value={item.unit || "pieces"}
                onChange={handleInputChange}
              >
                <option value="pieces">Pieces</option>
                <option value="kg">Kg</option>
                <option value="liters">Liters</option>
                <option value="packs">Packs</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                Manufacture Date
                {item.scanData?.manufactureDate && (
                  <span style={{
                    fontSize: "0.65rem",
                    background: "linear-gradient(135deg,#4caf50,#2e7d32)",
                    color: "white",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    fontWeight: "700",
                    letterSpacing: "0.03em",
                  }}>🔒 Scan-locked</span>
                )}
              </label>
              <input
                type="date"
                name="manufactureDate"
                value={item.manufactureDate || ""}
                onChange={item.scanData?.manufactureDate ? undefined : handleInputChange}
                readOnly={!!item.scanData?.manufactureDate}
                style={item.scanData?.manufactureDate ? {
                  background: "#f0fdf4",
                  borderColor: "#4caf50",
                  color: "#2e7d32",
                  cursor: "not-allowed",
                  fontWeight: "600",
                } : {}}
              />
              {item.scanData?.manufactureDate && (
                <small style={{ color: "var(--success)", display: "block", marginTop: "4px" }}>
                  ✅ Auto-filled from scan — cannot be edited
                </small>
              )}
            </div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                Expiry Date *
                {item.scanData?.expiryDate && (
                  <span style={{
                    fontSize: "0.65rem",
                    background: safetyStatus?.status === "expired"
                      ? "linear-gradient(135deg,#f44336,#b71c1c)"
                      : "linear-gradient(135deg,#4caf50,#2e7d32)",
                    color: "white",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    fontWeight: "700",
                    letterSpacing: "0.03em",
                  }}>🔒 Scan-locked</span>
                )}
              </label>
              <input
                type="date"
                name="expiryDate"
                value={item.expiryDate || ""}
                onChange={item.scanData?.expiryDate ? undefined : handleInputChange}
                readOnly={!!item.scanData?.expiryDate}
                required
                style={{
                  ...(item.scanData?.expiryDate ? {
                    background: safetyStatus?.status === "expired" ? "#fff0f0" : "#f0fdf4",
                    borderColor: safetyStatus?.status === "expired" ? "#f44336" : "#4caf50",
                    color: safetyStatus?.status === "expired" ? "#b71c1c" : "#2e7d32",
                    cursor: "not-allowed",
                    fontWeight: "600",
                  } : {
                    borderColor: safetyStatus?.status === "expired" ? "#f44336" : "#ddd",
                  }),
                }}
              />
              {item.scanData?.expiryDate && (
                <small style={{ color: "var(--success)", display: "block", marginTop: "4px" }}>
                  ✅ Auto-filled from scan — cannot be edited
                </small>
              )}
              {safetyStatus?.status === "expired" && (
                <small style={{ color: "#f44336", display: "block", marginTop: "4px" }}>
                  ❌ This product has expired and cannot be donated
                </small>
              )}
            </div>
          </div>
        </>
      )}

      {/* Cooked Food Specific Fields - NO EXPIRY DATE */}
      {item.foodType === "cooked" && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Meal Type *</label>
              <select
                name="mealType"
                value={item.mealType || ""}
                onChange={handleInputChange}
                required
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
                value={item.preparationTime || ""}
                onChange={handleInputChange}
                required
              />
              <small style={{ fontSize: "0.7rem", color: "#666" }}>
                {cookedAnalysis?.hoursSincePrep !== undefined &&
                cookedAnalysis.hoursSincePrep >= 0
                  ? `Prepared ${Math.round(cookedAnalysis.hoursSincePrep)} hour(s) ago`
                  : "When was the food prepared?"}
              </small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Unit *</label>
              <select
                name="unit"
                value={item.unit || "servings"}
                onChange={handleInputChange}
                required
              >
                <option value="servings">Servings</option>
                <option value="plates">Plates</option>
                <option value="bowls">Bowls</option>

                <option value="liters">Liters</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ingredients (Optional)</label>
              <textarea
                name="ingredients"
                value={item.ingredients || ""}
                onChange={handleInputChange}
                placeholder="List main ingredients (especially allergens like nuts, dairy, gluten)"
                rows="2"
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Storage Instructions (Optional)</label>
            <textarea
              name="storageInstructions"
              value={item.storageInstructions || ""}
              onChange={handleInputChange}
              placeholder="e.g., Keep refrigerated, Reheat before serving"
              rows="2"
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {/* Cooked Food Guidelines */}
          <div
            style={{
              padding: "0.75rem",
              background: "#0d0e0eff",
              borderRadius: "8px",
              marginTop: "1rem",
              border: "1px solid #2196f3",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>📋</span>
              <div>
                <strong style={{ color: "#19c499ff" }}>Safety Guidelines:</strong>
                <ul
                  style={{
                    margin: "0.5rem 0 0 0",
                    paddingLeft: "1rem",
                    fontSize: "0.8rem",
                  }}
                >
                  <li>Best donated within 2-4 hours of preparation</li>
                  <li>Must be properly stored at safe temperatures</li>
                  <li>
                    Clearly label ingredients (allergens like nuts, dairy,
                    gluten)
                  </li>
                  <li>Include preparation time for freshness tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DonationItem;
