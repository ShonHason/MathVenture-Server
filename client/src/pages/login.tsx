import React from "react";
import { Form, Input, Button, Tabs, Typography, Space } from "antd";
import {
  GoogleOutlined,
  AppleOutlined,
  FacebookOutlined,
} from "@ant-design/icons"; // Import icons
const { Title } = Typography;

interface FormValues {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}

export const LoginRegistration: React.FC = () => {
  const onLoginFinish = (values: FormValues) => {
    console.log("Login Success:", values);
  };

  const onRegisterFinish = (values: FormValues) => {
    console.log("Registration Success:", values);
  };

  return (
    <Space
      direction="vertical"
      style={{
        height: "100vh", // full viewport height
        display: "flex", // enables flexbox
        justifyContent: "center", // centers vertically
        alignItems: "center", // centers horizontally
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
              label: "Login",
              children: (
                <Form name="login" onFinish={onLoginFinish} layout="vertical">
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: "Please input your email!" },
                    ]}
                  >
                    <Input placeholder="Enter your email" />
                  </Form.Item>
                  <Form.Item
                    label="Password"
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: "Please input your password!",
                      },
                    ]}
                  >
                    <Input.Password placeholder="Enter your password" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      Login
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "2",
              label: "Register",
              children: (
                <Form
                  name="register"
                  onFinish={onRegisterFinish}
                  layout="vertical"
                >
                  <Form.Item
                    label="Name"
                    name="name"
                    rules={[
                      { required: true, message: "Please input your name!" },
                    ]}
                  >
                    <Input placeholder="Enter your name" />
                  </Form.Item>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: "Please input your email!" },
                    ]}
                  >
                    <Input placeholder="Enter your email" />
                  </Form.Item>
                  <Form.Item
                    label="Password"
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: "Please input your password!",
                      },
                    ]}
                  >
                    <Input.Password placeholder="Create a password" />
                  </Form.Item>
                  <Form.Item
                    label="Confirm Password"
                    name="confirmPassword"
                    dependencies={["password"]}
                    rules={[
                      {
                        required: true,
                        message: "Please confirm your password!",
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error("The two passwords do not match!")
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="Confirm your password" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      Register
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
