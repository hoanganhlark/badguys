import { Card, Skeleton, Row, Col } from "antd";

export default function MatchFormPanelSkeleton() {
  return (
    <div className="space-y-4">
      {/* Match Type Selection */}
      <Card>
        <Skeleton paragraph={{ rows: 2 }} active />
      </Card>

      {/* Team Selection */}
      <Card>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Skeleton paragraph={{ rows: 3 }} active />
          </Col>
          <Col xs={24} sm={12}>
            <Skeleton paragraph={{ rows: 3 }} active />
          </Col>
        </Row>
      </Card>

      {/* Match Sets */}
      <Card>
        <Skeleton paragraph={{ rows: 5 }} active />
      </Card>

      {/* Date and Save */}
      <Card>
        <Skeleton paragraph={{ rows: 3 }} active />
      </Card>
    </div>
  );
}
