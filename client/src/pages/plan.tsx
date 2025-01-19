import React from "react";
import { Typography, Button, Space, Card, Radio } from "antd";

const { Title, Text } = Typography;

const plans = [
  {
    name: "Basic",
    price: "חינמי",
    features: [
      "שיעור שבועי למשך 30 דקות",
      "תרגילים ברמות בסיסי/קל",
      "סיכום קצר של הביצועים",
      "תרגולים כלליים",
      "חסימת אישית - ❌",
      "התגמשות אישית - ❌",
      "הוספת תלמידים - ❌",
    ],
    buttonText: "Choose Plan",
    buttonColor: "#e3f2fd",
  },
  {
    name: "Advance",
    price: "60₪",
    features: [
      "שיעורים ללא הגבלה",
      "תרגילים מותאמים אישית",
      "מעקב התקדמות מתקדם",
      "תרגול מעבר",
      "התאמת א/י אישית - ✔️",
      "התגמשות אישית - ✔️",
      "הוספת תלמידים - ✔️",
    ],
    buttonText: "Choose Plan",
    buttonColor: "#fffde7",
  },
];

const ChoosePlanPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">(
    "monthly"
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        background: "#f9f9f9",
        textAlign: "center",
      }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Title level={2}>בחר את התוכנית שלך</Title>

        <Space>
          <Radio.Group
            value={billingCycle}
            onChange={(e) =>
              setBillingCycle(e.target.value as "monthly" | "yearly")
            }
            buttonStyle="solid"
          >
            <Radio.Button value="monthly">חודשית</Radio.Button>
            <Radio.Button value="yearly">שנתית (חיסכון 2.5%)</Radio.Button>
          </Radio.Group>
        </Space>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginTop: "20px",
          }}
        >
          {plans.map((plan) => (
            <Card
              key={plan.name}
              style={{
                width: 300,
                borderRadius: "10px",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                background: "#fff",
              }}
            >
              <Space direction="vertical" size="middle">
                <Title level={3}>{plan.name}</Title>
                <Title level={4} style={{ color: "#ffa500" }}>
                  {plan.price} {billingCycle === "yearly" && "(חיסכון 2.5%)"}
                </Title>

                <ul style={{ textAlign: "right", paddingRight: "20px" }}>
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <Text>{feature}</Text>
                    </li>
                  ))}
                </ul>

                <Button
                  type="primary"
                  style={{
                    backgroundColor: plan.buttonColor,
                    border: "none",
                  }}
                >
                  {plan.buttonText}
                </Button>
              </Space>
            </Card>
          ))}
        </div>
      </Space>
    </div>
  );
};

export default ChoosePlanPage;
