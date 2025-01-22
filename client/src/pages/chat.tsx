import React, { useState } from "react";
import { Input, Button, Layout, Typography, List, Avatar } from "antd";
import { SendOutlined } from "@ant-design/icons";
import "../ui/chat.css";
// import { sendMessageToServer } from "../services/api";

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

type Message = {
  id: number;
  content: string;
  sender: "תלמיד" | "מורה";
};

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      content: input,
      sender: "תלמיד",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate server response
    // const botResponse = await sendMessageToServer(input);

    const botResponse = `Simulated response for "${input}"`;

    const botMessage: Message = {
      id: Date.now() + 1,
      content: botResponse,
      sender: "מורה",
    };

    setMessages((prev) => [...prev, botMessage]);
  };

  return (
    <Layout className="chat-layout">
      <Header className="chat-header">
        <Text className="chat-title">שיעור אישי</Text>
      </Header>
      <Content className="chat-content">
        <List
          dataSource={messages}
          renderItem={(message) => (
            <List.Item
              className={`chat-message ${
                message.sender === "תלמיד" ? "user-message" : "bot-message"
              }`}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    style={{
                      backgroundColor:
                        message.sender === "תלמיד" ? "#1890ff" : "#ff4d4f",
                    }}
                  >
                    {message.sender === "תלמיד" ? "U" : "B"}
                  </Avatar>
                }
                title={message.sender === "תלמיד" ? "You" : "AI Bot"}
                description={message.content}
              />
            </List.Item>
          )}
        />
      </Content>
      <Footer className="chat-footer">
        <Input
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          className="chat-input"
          suffix={
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
            />
          }
        />
      </Footer>
    </Layout>
  );
};
