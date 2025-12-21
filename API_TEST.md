# API Test - Revenue by Customer Group

## Endpoint
```
GET /api/orders/admin/revenue-by-group?startDate=2024-01-01&endDate=2024-12-31
```

## Expected Response
```json
{
  "success": true,
  "data": [
    {
      "groupName": "VIP",
      "groupId": "507f1f77bcf86cd799439011",
      "revenue": 50000
    },
    {
      "groupName": "רגילה", 
      "groupId": "507f1f77bcf86cd799439012",
      "revenue": 25000
    },
    {
      "groupName": "ללא קבוצה",
      "groupId": null,
      "revenue": 15000
    }
  ]
}
```

## Implementation Details

### Backend Flow:
1. **orderService.getRevenueByCustomerGroup()** - Aggregation pipeline
   - Matches orders by date and status
   - Joins with users and customergroups
   - Groups by groupId and calculates total revenue
   - Returns sorted by revenue descending

2. **orderController.getRevenueByCustomerGroup()** - HTTP handler
   - Extracts startDate and endDate from query params
   - Calls service and returns JSON response

3. **Route**: GET /api/orders/admin/revenue-by-group
   - Protected with requireAdmin middleware

### Frontend Flow:
1. **InteractiveChartsCard** - Main component
   - Calls getRevenueByCustomerGroup() from orderService
   - Handles response and sets chartData state
   - Displays 4 chart types with same data

2. **Chart Components**:
   - LineChartComponent: Bar chart showing revenue by group
   - BarChartComponent: Bar chart with rotated labels
   - PieChartComponent: Pie chart showing proportions
   - AreaChartComponent: Bar chart with opacity effect

### Data Structure
```typescript
interface ChartData {
  groupName: string;        // "VIP", "רגילה", "ללא קבוצה"
  groupId: string | null;   // MongoDB ID or null
  revenue: number;          // Total revenue for this group
}
```

### Sample Data (for testing)
If no data is found, frontend shows:
```javascript
[
  { groupName: 'VIP', groupId: 'sample1', revenue: 15000 },
  { groupName: 'רגילה', groupId: 'sample2', revenue: 8000 },
  { groupName: 'ללא קבוצה', groupId: null, revenue: 2000 }
]
```

## Debugging
- Frontend logs:
  - `🔍 Revenue by Group Response:` - Full response
  - `✅ Valid Data:` - Filtered valid data
  - `⚠️ No data found, showing sample data` - When empty
  - `❌ Error fetching chart data:` - Error details

- Backend logs:
  - `ORDER_API_GET_REVENUE_BY_GROUP_ERROR` - Any errors
