import React from "react";
import { Form, Input, Button, Tabs, Typography, Space } from "antd";
import {
  GoogleOutlined,
  AppleOutlined,
  FacebookOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
const { Title } = Typography;

interface FormValues {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}

export const LoginRegistration: React.FC = () => {
  const navigate = useNavigate();

  const onLoginFinish = (values: FormValues) => {
    console.log("Login Success:", values);
  };

  const onRegisterFinish = (values: FormValues) => {
    console.log("Registration Success:", values);
    navigate("/quiz");
  };

  return (
    <Space
      direction="vertical"
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <Space
        direction="vertical"
        style={{
          maxWidth: "400px",
          width: "100%",
          padding: "24px",
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Title level={2} style={{ textAlign: "center" }}>
          Mathventure{" "}
        </Title>
        <Title level={2} style={{ textAlign: "center" }}>
          ברוך הבא למטיברס!{" "}
        </Title>
        <Title level={2} style={{ textAlign: "center" }}>
          :בחר אחת מן האופציות הבאות{" "}
        </Title>
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: "התחברות",
              children: (
                <Form name="login" onFinish={onLoginFinish} layout="vertical">
                  <Form.Item
                    label="אימייל"
                    name="email"
                    rules={[
                      { required: true, message: "אנא הכנס את האימייל שלך!" },
                    ]}
                  >
                    <Input placeholder="הכנס אימייל" />
                  </Form.Item>
                  <Form.Item
                    label="סיסמא"
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: "אנא הכנס את הסיסמא שלך!",
                      },
                    ]}
                  >
                    <Input.Password placeholder="הכנס סיסמא" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      התחבר
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "2",
              label: "הרשמה",
              children: (
                <Form
                  name="register"
                  onFinish={onRegisterFinish}
                  layout="vertical"
                >
                  <Form.Item
                    label="שם ההורה"
                    name="name"
                    rules={[{ required: true, message: "אנא הכנס את שמך!" }]}
                  >
                    <Input placeholder="שם ההורה" />
                  </Form.Item>
                  <Form.Item
                    label="אימייל"
                    name="email"
                    rules={[{ required: true, message: "" }]}
                  >
                    <Input placeholder="אנא הכנס את האימייל שלך!" />
                  </Form.Item>
                  <Form.Item
                    label="סיסמא"
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: "אנא הכנס סיסמא!",
                      },
                    ]}
                  >
                    <Input.Password placeholder="צור סיסמא" />
                  </Form.Item>
                  <Form.Item
                    label="אשר סיסמה"
                    name="confirmPassword"
                    dependencies={["password"]}
                    rules={[
                      {
                        required: true,
                        message: "אנא אשר את הסיסמא!",
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error("הסיסמאות אינן תואמות!")
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="אשר את הסיסמא שלך" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      הירשם
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />

        {/* Social Media Login Section */}
        <Space
          direction="horizontal"
          style={{
            width: "75%",
            marginTop: "20px",
            justifyContent: "space-between",
          }} // horizontal layout
          align="center"
        >
          <Button
            icon={<GoogleOutlined />}
            style={{ width: "700%" }}
            size="large"
          ></Button>
          <Button
            icon={<AppleOutlined />}
            style={{ width: "700%" }}
            size="large"
          ></Button>
          <Button
            icon={<FacebookOutlined />}
            style={{ width: "700%" }}
            size="large"
          ></Button>
        </Space>
      </Space>
    </Space>
  );
};

export default LoginRegistration;
