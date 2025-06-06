"use client";

import Tables from "@/components/Table";
import { SearchOutlined } from "@ant-design/icons";
import { Col, Form, Input, Row, Tabs } from "antd";

const onChange = (key) => {
  console.log(key);
};

const items = [
  {
    key: "1",
    label: "Tab 1",
    children: <Tables />,
  },
  {
    key: "2",
    label: "Tab 2",
    children: <Tables />,
  },
  {
    key: "3",
    label: "Tab 3",
    children: <Tables />,
  },
];

const CaseManagementPage = () => {
  return (
    <div className="py-8 px-12 w-[100%]">
      <h2 className="text-2xl font-bold mb-4">Case Management</h2>

      <Form
        name="login"
        initialValues={{ remember: true }}
        
        className="max-w-[100%]"
        
      >
        <Row>
          <Col span={24}>
            <Form.Item
              name="username"
              className="w-[100%]"
              rules={[
                { required: true, message: "Please input your Username!" },
              ]}
            >
              <Input prefix={<SearchOutlined />} placeholder="Search..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <div>
        <Tabs
          defaultActiveKey="1"
          items={items}
          
        />
      </div>
    </div>
  );
};

export default CaseManagementPage;
