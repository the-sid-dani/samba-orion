# Charts Artifacts - Interactive Data Visualization

The Charts Artifacts feature enables users to create interactive visualizations through AI conversation with a workspace UI similar to ChatGPT's Canvas and Claude's Artifacts.

## Overview

Charts Artifacts provide a seamless way to transform data discussions into interactive visualizations that appear in a dedicated workspace alongside your chat. The AI can create, modify, and enhance charts through natural conversation.

## Features

### Supported Chart Types (16 Specialized Tools)

**Core Charts:**
- **Bar Charts**: Perfect for comparisons and categorical data
- **Line Charts**: Ideal for trends over time and continuous data
- **Pie Charts**: Great for showing parts of a whole
- **Area Charts**: Show cumulative totals and proportions over time

**Advanced Visualizations:**
- **Scatter Charts**: Plot relationships between two variables
- **Radar Charts**: Multi-dimensional data comparison
- **Funnel Charts**: Visualize process flows and conversion rates
- **Treemap Charts**: Hierarchical data with nested rectangles
- **Sankey Diagrams**: Flow visualizations showing data movement
- **Radial Bar Charts**: Circular bar charts for cyclical data
- **Composed Charts**: Combine multiple chart types in one view

**Specialized Charts:**
- **Geographic Charts**: Maps with regional data visualization
- **Gauge Charts**: Single-value indicators with ranges
- **Calendar Heatmaps**: Time-based data patterns across dates
- **Data Tables**: Structured tabular data presentation

**Dashboard Orchestration:**
- **Dashboard Orchestrator**: Create coordinated multi-chart dashboards

### Interactive Workspace
- **Side-by-side Layout**: Charts appear in a workspace next to the chat
- **Real-time Updates**: Charts stream updates as they're generated
- **Multi-tab Support**: Multiple charts can be open simultaneously
- **Edit Mode**: Direct editing of chart data and settings
- **Version History**: Track changes over time

### AI Integration
- **Natural Language**: Create charts through conversation
- **Smart Suggestions**: AI recommends appropriate chart types
- **Data Generation**: AI can generate realistic sample data
- **Real-time Modifications**: Update charts through follow-up requests

## Usage

### Creating Charts

Simply ask the AI to create a chart in natural language:

```
"Create a bar chart showing quarterly sales data"
"Make a pie chart of browser usage statistics"
"Show me a line chart of temperature trends over the year"
"Visualize this data as a chart: [your data]"
```

The AI will:
1. Generate appropriate data (if not provided)
2. Choose the best chart type for your request
3. Create an interactive chart in the workspace
4. Provide insights about the visualization

### Modifying Charts

Once a chart is created, you can modify it through conversation:

```
"Add more data points to the chart"
"Change this to a line chart instead"
"Update the colors to use a blue theme"
"Add labels to the axes"
"Make the chart show monthly data instead of quarterly"
```

### Direct Editing

Charts support direct editing in the workspace:
- **Chart Tab**: View the interactive visualization
- **Edit Tab**: Modify chart settings, type, and styling
- **Data Tab**: View and edit raw chart data

### Workspace Controls

- **Resize**: Drag the divider between chat and workspace
- **Maximize**: Full-screen the workspace for detailed work
- **Minimize**: Hide the workspace to focus on chat
- **Tabs**: Switch between multiple chart artifacts
- **Close**: Remove charts you no longer need

## Technical Implementation

### Architecture

The Charts Artifacts system follows the Vercel Chat SDK artifacts pattern:

```
User Request → AI Tool Call → Chart Generation →
Workspace Display → Interactive Editing → Database Persistence
```

### Components

- **Chart Tools**: AI tools for creating and updating charts
- **Artifacts Framework**: Base system for workspace functionality
- **Chart Client**: Interactive chart rendering and editing
- **Chart Server**: AI-powered chart generation and updates
- **API Layer**: REST endpoints for chart persistence

### Data Flow

1. **Creation**: AI calls specialized chart tool (e.g., `create_bar_chart`) with data and specifications
2. **Generation**: Server processes request and streams chart data progressively
3. **Display**: Client renders chart in Canvas workspace using Recharts
4. **Interaction**: User can edit directly or request AI modifications
5. **Persistence**: Changes saved to database with version history

## Chart Data Format

Charts use a standardized data structure:

```typescript
interface ChartDataPoint {
  xAxisLabel: string;
  series: Array<{
    seriesName: string;
    value: number;
  }>;
}
```

Example data:
```json
[
  {
    "xAxisLabel": "Q1 2024",
    "series": [
      {"seriesName": "Sales", "value": 12000},
      {"seriesName": "Profit", "value": 4000}
    ]
  },
  {
    "xAxisLabel": "Q2 2024",
    "series": [
      {"seriesName": "Sales", "value": 15000},
      {"seriesName": "Profit", "value": 5500}
    ]
  }
]
```

## Best Practices

### For Users
- **Be Specific**: Provide clear chart titles and data context
- **Iterate**: Start with basic charts and refine through conversation
- **Explore**: Try different chart types to find the best visualization
- **Save**: Important charts are automatically saved with version history

### For Developers
- **Follow Patterns**: Use the existing artifacts framework for new artifact types
- **Stream Updates**: Provide real-time feedback during chart generation
- **Validate Data**: Ensure chart data is properly formatted and meaningful
- **Handle Errors**: Provide fallback charts when generation fails

## API Reference

### Specialized Chart Tools

Each chart type has its own dedicated tool with specific parameters optimized for that visualization:

```typescript
// Example: Bar Chart Tool
create_bar_chart({
  title: string,
  data: ChartDataPoint[],
  xAxisLabel?: string,
  yAxisLabel?: string,
  canvasName?: string,
  description?: string
})

// Example: Geographic Chart Tool
create_geographic_chart({
  title: string,
  mapType: "world" | "usa-states" | "usa-counties" | "usa-dma",
  data: Array<{ region: string, value: number }>,
  canvasName?: string,
  description?: string
})

// All chart tools follow similar patterns with type-specific parameters
```

**Available Tools:**
`create_bar_chart`, `create_line_chart`, `create_pie_chart`, `create_area_chart`, `create_scatter_chart`, `create_radar_chart`, `create_funnel_chart`, `create_treemap_chart`, `create_sankey_chart`, `create_radial_bar_chart`, `create_composed_chart`, `create_geographic_chart`, `create_gauge_chart`, `create_calendar_heatmap`, `createTable`, `create_dashboard`

### REST API Endpoints
- `GET /api/artifacts` - List user's artifacts
- `POST /api/artifacts` - Create new artifact (streaming)
- `GET /api/artifacts/[id]` - Get specific artifact
- `PUT /api/artifacts/[id]` - Update artifact (streaming)
- `DELETE /api/artifacts/[id]` - Delete artifact
- `GET /api/artifacts/[id]/versions` - Get version history

## Examples

### Sales Dashboard
```
User: "Create a comprehensive sales dashboard showing our Q1-Q4 performance"

AI: Creates multiple charts showing:
- Quarterly revenue (bar chart)
- Monthly trend (line chart)
- Revenue by region (pie chart)
```

### Data Analysis
```
User: "I have this CSV data about website traffic. Can you visualize it?"

AI:
1. Analyzes the provided data
2. Suggests appropriate visualizations
3. Creates interactive charts
4. Provides insights and observations
```

### Iterative Refinement
```
User: "Create a chart showing mobile vs desktop usage"
AI: Creates initial pie chart

User: "Actually, show this as a trend over the last 6 months"
AI: Updates to line chart with monthly data

User: "Add tablet usage as well"
AI: Adds tablet data series to the chart
```

## Troubleshooting

### Common Issues
- **Chart Not Appearing**: Check if workspace is visible (toggle with workspace controls)
- **Data Issues**: Verify data format matches expected structure
- **Performance**: Large datasets may take time to render
- **Browser Compatibility**: Modern browsers required for full functionality

### Debug Information
- Check browser console for errors
- Verify network requests to `/api/artifacts/` endpoints
- Monitor chart generation logs in development mode

## Future Enhancements

- Additional chart types (histogram, waterfall, bullet charts)
- Advanced styling and theming options
- Data import from CSV/Excel files
- Chart export functionality (PNG, SVG, PDF)
- Real-time data connections and live updates
- Collaborative editing features
- Chart templates and preset styles

---

The Charts Artifacts feature transforms Samba-Orion into a powerful data visualization platform, enabling seamless creation and exploration of interactive charts through natural conversation.