<notes>
<critical>
Below are notes from a video course about working with the Claude language model.
Use these notes as a resource to answer the user's question.
Write your answer as a standalone response - do not refer directly to these notes unless specifically requested by the user.
</critical>
<note title="What is a Coding Assistant?">
Coding Assistant = tool that uses language models to write code and complete development tasks

Core Process:
1. Receives task (e.g., fix bug from error message)
2. Language model gathers context (reads files, understands codebase)
3. Formulates plan to solve issue
4. Takes action (updates files, runs tests)

Key Limitation: Language models only process text input/output - cannot directly read files, run commands, or interact with external systems.

Tool Use System = method enabling language models to perform actions:
- Assistant appends instructions to user request
- Instructions specify formatted responses for actions (e.g., "read file: filename")
- Language model responds with formatted action request
- Assistant executes actual action (reads file, runs command)
- Results sent back to language model for final response

Claude Models Advantage:
- Superior tool use capabilities vs other language models
- Better at understanding tool functions and combining them for complex tasks
- Claude Code is extensible - easy to add new tools
- Better security through direct code search vs indexing that sends codebase to external servers

Essential Points:
- All language models require tool use for non-text generation tasks
- Tool use quality directly impacts coding assistant effectiveness
- Claude's strength in tool use makes it adaptable to development changes
</note>

<note title="Claude Code in Action">
Claude Code = AI assistant with tool-based capabilities for code tasks

Default tools = file reading/writing, command execution, basic development operations

Performance optimization demo: Claude analyzed Chalk JavaScript library (5th most downloaded JS package, 429M weekly downloads). Used benchmarks, profiling tools, created todo lists, identified bottlenecks, implemented fixes. Result = 3.9x throughput improvement.

Data analysis demo: Claude performed churn analysis on video streaming platform CSV data using Jupyter notebooks. Executed code cells iteratively, viewed results, customized successive analyses based on findings.

Tool extensibility: Claude Code accepts new tool sets. Example used Playwright MCP server for browser automation. Claude opened browser, took screenshots, updated UI styling, iterated on design improvements.

GitHub integration: Claude Code runs in GitHub Actions, triggered by pull requests/issues. Gets GitHub-specific tools (comments, commits, PR creation). 

Infrastructure review example: Terraform-defined AWS infrastructure with DynamoDB table and S3 bucket shared with external partner. Developer added user email to Lambda function output. Claude Code automatically detected PII exposure risk in pull request review by analyzing infrastructure flow and identifying external data sharing.

Key principle: Claude Code = flexible assistant that grows with team needs through tool expansion rather than fixed functionality.
</note>

<note title="Adding Context">
Context management = critical for Claude Code effectiveness. Too much irrelevant info decreases performance.

/init command = analyzes entire codebase on first run, creates Claude.md file with project summary/architecture/key files. File contents included in every request.

Three Claude.md file types:
- Project level = shared with team, committed to source control
- Local level = personal instructions, not committed  
- Machine level = global instructions for all projects

Memory mode (# symbol) = edit Claude.md files intelligently with natural language requests

@ symbol = mention specific files to include in requests, provides targeted context instead of letting Claude search

Best practice = reference critical files (like database schemas) in Claude.md so they're always available as context

Goal = provide just enough relevant information for Claude to complete tasks effectively
</note>

<note title="Making Changes">
Claude Code Change Management:

Screenshot integration = Control-V (not Command-V on macOS) pastes screenshots to help Claude understand specific UI elements to modify

Performance boosting modes:
- Plan Mode = Shift + Tab twice, makes Claude research more files and create detailed implementation plans before executing
- Thinking Mode = triggered by phrases like "Ultra think", gives Claude extended reasoning budget for complex logic

Planning vs Thinking usage:
- Planning = handles breadth, useful for multi-step tasks requiring wide codebase understanding
- Thinking = handles depth, useful for tricky logic or debugging specific issues
- Can be combined for complex tasks
- Both consume additional tokens (cost consideration)

Git integration = Claude Code can stage/commit changes and write descriptive commit messages

Key workflow: Screenshot problematic area → paste with Control-V → describe desired change → optionally enable Plan/Thinking modes for complex tasks → review and accept implementation
</note>

<note title="Controlling Context">
Context Control Techniques:

Escape = Stops Claude mid-response to redirect conversation flow. Press once to interrupt current output.

Escape + Memory = Powerful error prevention. Stop Claude, add memory about repeated mistakes using # shortcut to prevent future occurrences.

Double Escape = Conversation rewind. Shows all previous messages, allows jumping back to earlier point while maintaining relevant context and skipping irrelevant debugging/back-and-forth.

Compact Command = Summarizes entire conversation history while preserving Claude's learned knowledge about current task. Use when Claude has gained expertise but conversation has accumulated clutter.

Clear Command = Deletes entire conversation history for fresh start. Use when switching to completely unrelated tasks.

Key Benefits: Maintains focus, reduces distracting context, preserves relevant knowledge, prevents repeated errors. Most effective for long conversations and task transitions.
</note>

<note title="Custom Commands">
Custom Commands = user-defined automation commands in Claude Code accessed via forward slash

Location = .Claude/commands/ folder in project directory
File naming = filename becomes command name (audit.md creates /audit command)
Activation = restart Claude Code after creating command files

Command structure = markdown file containing instructions for Claude to execute
Arguments = use $arguments placeholder in command text to accept runtime parameters
Argument types = any string (file paths, descriptive text, etc.)

Use cases = automating repetitive tasks like dependency auditing, test generation, vulnerability fixes
Execution = /commandname in Claude Code interface, optionally followed by argument string
</note>

<note title="Extending Claude Code with MCP Servers">
MCP servers = external tools that extend Claude Code capabilities, run locally or remotely.

Playwright MCP server = popular server enabling Claude to control browsers for web automation.

Installation: Terminal command \`claude mcp add [name] [start-command]\` adds MCP server to Claude Code.

Permission management: Initial tool usage requires approval. Auto-approve by adding "MCP__[servername]" to settings.local.json allow array.

Practical example: Claude used Playwright to navigate localhost:3000, generate UI component, analyze styling quality, then automatically update generation prompts based on visual feedback.

Results: Automated prompt refinement produced significantly better component styling, demonstrating MCP servers unlock sophisticated development workflows.

Key benefit: MCP servers enable Claude to perform complex multi-step tasks involving external systems, expanding beyond code editing to full development automation.
</note>

<note title="Github Integration">
Claude Code GitHub Integration = official integration allowing Claude to run inside GitHub actions

Setup Process:
- Run "/install GitHub app" command
- Install Claude Code app on GitHub
- Add API key
- Auto-generated pull request adds two GitHub actions

Default Actions:
1. Mention support = @Claude in issues/PRs to assign tasks
2. PR review = automatic code review on new pull requests

Customization:
- Actions are customizable via config files in .github/workflows directory
- Custom instructions = direct context/directions passed to Claude
- MCP server integration = allows Claude to access external tools (like Playwright for browser automation)

Permission Requirements:
- Must explicitly list all permissions for Claude Code in actions
- MCP server tools require individual permission listing (no shortcuts)

Example Use Case:
- Integrated Playwright MCP server for browser testing
- Development server setup before Claude runs
- Claude can visit app in browser, test functionality, create checklists
- Provides automated testing and issue verification

Key Features = mention-based task assignment, automated PR reviews, customizable workflows, MCP server integration for extended functionality
</note>

<note title="Introducing Hooks">
Hooks = commands that run before/after Claude executes tools

Pre-tool use hooks = run before tool execution, can inspect and block tool operations, send error messages to Claude
Post-tool use hooks = run after tool execution, perform follow-up operations, provide feedback to Claude

Configuration = added to Claude settings file (global/project/personal) via manual editing or /hooks command

Hook structure = two sections (pre-tool use, post-tool use), each with matcher (specifies which tools to target) and commands to execute

Example uses = auto-format files after creation, run tests after edits, block file access, code quality checks, type checking

Hook commands = receive tool call details, can modify Claude's workflow through blocking or feedback mechanisms
</note>

<note title="Defining Hooks">
**Hooks Overview**
Hooks = mechanisms to intercept and control tool calls before/after execution

**Hook Types**
Pre-tool use hook = executes before tool call, can block execution
Post-tool use hook = executes after tool call, cannot block execution

**Hook Implementation Process**
1. Choose hook type (pre vs post)
2. Identify target tool names to monitor
3. Write command to receive tool call data via stdin as JSON
4. Parse JSON containing tool_name and input parameters
5. Exit with appropriate code to signal intent

**Exit Codes**
Exit 0 = allow tool call to proceed
Exit 2 = block tool call (pre-tool use only)
Standard error output = feedback message sent to Claude when blocking

**Tool Call Data Structure**
JSON object containing:
- tool_name (e.g., "read", "grep")
- input parameters (e.g., file_path)

**Common Use Case**
Blocking file access by monitoring "read" and "grep" tools that can access file contents

**Tool Discovery**
Ask Claude directly for list of available tool names rather than memorizing them
</note>

<note title="Defining Hooks">
Hooks = mechanisms to control Claude's tool usage by running custom commands before/after tool calls

Pre-tool use hook = executes before tool call, can block with exit code 2
Post-tool use hook = executes after tool call, cannot block

Hook process:
1. Claude sends tool call data as JSON via stdin to your command
2. Command parses JSON containing tool_name and input arguments  
3. Command exits with code 0 (allow) or 2 (block for pre-hooks only)
4. Exit code 2 sends stderr output as feedback to Claude

Tool call data format = JSON object with tool name and input parameters

Common tools that read files = "read" tool and "grep" tool

Hook use case example = blocking Claude from reading sensitive .env file by watching for read/grep tools targeting that file path

Setup = define command in project, Claude automatically executes it when relevant tool calls occur
</note>

<note title="Implementing a Hook">
**Custom Hook Implementation**

Hook purpose = prevent Claude from reading .env file contents

**Configuration Setup**
- Location = .clod/settings.local.json
- Hook type = pre-tool use hook (blocks before execution)
- Matcher = "read|grep" (pipe symbol separates tool names)
- Command = "node ./hooks/read_hook.js"

**Implementation Details**
- Hook receives JSON object via stdin containing: session ID, tool name, tool input, file path
- Logic: if file path includes ".env" → exit with code 2 + log error to stderr
- Error output goes to stderr for Claude feedback
- Exit code 2 = blocked operation

**Key Requirements**
- Must restart Claude after hook changes
- Console.error() sends feedback to Claude via stderr
- Hook works for both read and grep tools
- File path checking: tool_input.path with fallback handling

**Testing Results**
- Successfully blocks .env file access
- Claude recognizes prevention by read hook
- Works for both read and grep operations
</note>

<note title="Implementing a Hook">
**Hook Implementation Process:**

Hook = custom script that intercepts and controls tool usage in Clod

**Configuration (settings.local.json):**
- Pre-tool use hooks = run before tool execution
- Post-tool use hooks = run after tool execution
- Matcher = specifies which tools to intercept (e.g., "read|grep")
- Command = script to execute when matched tools are called

**Implementation Steps:**
1. Add hook config to settings.local.json with matcher and command
2. Create hook script (e.g., read_hook.js) that receives JSON input via stdin
3. JSON input contains: session ID, tool name, tool input, file path
4. Script logic: check if file path includes ".env"
5. If blocked file detected: console.error() message + process.exit(2)
6. Exit code 2 = blocks tool execution

**Key Technical Details:**
- Hook script receives tool data as JSON from stdin
- Use console.error() to send feedback to Clod (logs to stderr)
- Must restart Clod after hook changes
- Hook applies to all specified tools (read, grep, etc.)
- Fallback path checking via tool_input.path for compatibility

**Result:** Successfully prevents Clod from reading .env files while providing user feedback about blocked operations.
</note>

<note title="Useful Hooks!">
**Useful Hooks for Claude Code Projects**

**Problem**: Claude Code often misses type errors and creates duplicate code, especially in larger projects.

**Hook 1: TypeScript Type Checker Hook**
- **Purpose**: Catch type errors immediately after file edits
- **Implementation**: Run \`tsc --no-emit\` after TypeScript file changes via post-tool-use hook
- **Process**: Detects type errors → feeds errors back to Claude → Claude fixes call sites automatically
- **Benefits**: Prevents broken function calls when signatures change
- **Adaptable**: Works for any typed language with type checker, or use tests for untyped languages

**Hook 2: Duplicate Code Prevention Hook**
- **Problem**: Claude creates new queries/functions instead of reusing existing ones, especially in complex tasks
- **Solution**: Launch separate Claude instance to review changes in specific directories (e.g., queries folder)
- **Process**: 
  1. Detect edits to watched directory
  2. Launch new Claude instance via TypeScript SDK
  3. Compare new code against existing code
  4. If duplicate found, exit with code 2 + feedback
  5. Original Claude receives feedback and reuses existing code
- **Trade-offs**: Extra time/cost vs cleaner codebase
- **Recommendation**: Only watch critical directories to minimize overhead

**Key Takeaway**: Hooks = automated feedback loops that catch common Claude Code weaknesses (type errors, code duplication) by running additional checks and feeding results back to Claude for self-correction.
</note>

<note title="Useful Hooks!">
TypeScript Type Checker Hook:
- Problem: Claude edits function signatures but doesn't update call sites, causing type errors
- Solution: Post-tool-use hook that runs \`tsc --no-emit\` after TypeScript file edits
- Process: Detects type errors → feeds errors back to Claude → Claude fixes call sites automatically
- Works for any typed language with type checker, or untyped languages using tests instead

Query Deduplication Hook:
- Problem: Claude creates duplicate SQL queries/functions instead of reusing existing ones, especially in complex tasks
- Cause: Focused tasks work well, but wrapped/complex tasks make Claude lose focus
- Solution: Hook monitors query directory changes → launches separate Claude instance → reviews for duplicates → provides feedback to original Claude
- Process: File edit in queries/ → secondary Claude analyzes existing queries → reports duplicates → primary Claude removes duplicate and reuses existing code
- Trade-off: Additional time/cost vs cleaner codebase with less duplication
- Recommendation: Only apply to critical directories to minimize overhead

Both hooks use post-tool-use pattern to provide immediate feedback and course correction to Claude's edits.
</note>

<note title="The Claude Code SDK">
Claude Code SDK = programmatic interface for Claude Code with CLI, TypeScript, and Python libraries. Contains same tools as terminal version.

Primary use case = integration into larger pipelines/workflows to add intelligence to existing processes.

Default permissions = read-only (files, directories, grep operations). Write permissions require manual configuration via options.allowTools array or .Claude directory settings.

SDK execution shows raw conversation between local Claude Code and language model, with final response as last message.

Key implementation pattern = add write permissions by specifying tools like "edit" in options.allowTools when making query calls.

Best suited for = helper commands, scripts, and hooks within existing projects rather than standalone usage.
</note>

<note title="The Claude Code SDK">
Claude Code SDK = programmatic interface to use Claude Code via CLI, TypeScript, or Python libraries. Same tools as terminal version.

Primary use case = integration into larger pipelines/workflows to add intelligence to processes.

Key characteristics:
- Default permissions = read-only (files, directories, grep operations)
- Write permissions = must be manually enabled via query options or settings file
- Raw conversation output = shows message-by-message exchange between local Claude Code and language model

Best applications = helper commands, scripts, hooks within existing projects rather than standalone use.

Output format = conversational messages with final response from Claude as last message.
</note>

<note title="MCP Servers in GitHub Actions">
**Model Context Protocol (MCP) Integration for Remote Agents**

MCP servers transform GitHub Actions workflows into powerful remote agents capable of complex automation, web interaction, research, and API integration.

**Core Configuration Pattern:**
```yaml
claude_args: |
  --mcp-config .mcp.json
  --allowed-tools "mcp__server__tool"
  --max-turns 10

env:
  SERVER_API_KEY: ${{ secrets.SERVER_API_KEY }}
```

**Project-Scoped MCP Configuration (.mcp.json):**
- Shared team configuration committed to source control
- Environment variable expansion for secure API key management
- Automatic server discovery and tool binding

**Key Benefits:**
- **Web Automation**: Browser control for UI testing, screenshots, and interaction validation
- **Research Capabilities**: Deep web search, company analysis, and technical documentation
- **API Integration**: OpenAPI documentation analysis and endpoint testing
- **Library Documentation**: Up-to-date framework and library reference access

**Remote Agent Workflow:**
1. GitHub event triggers action (PR, issue, comment)
2. MCP servers initialize with secure environment variables
3. Claude Code gains access to extended tool capabilities
4. Agent performs complex, multi-step tasks autonomously
5. Results integrated back into GitHub (comments, commits, status checks)
</note>

<note title="Available MCP Servers and Capabilities">
**Comprehensive MCP Server Ecosystem for Better Chatbot Project**

**1. Browserbase MCP (browserbasehq-mcp-browserbase)**
- **Purpose**: Cloud-based browser automation and testing
- **Key Tools**:
  - `multi_browserbase_stagehand_navigate`: Navigate to URLs
  - `multi_browserbase_stagehand_act`: Perform UI actions (click, type, scroll)
  - `multi_browserbase_stagehand_observe`: Analyze page elements
  - `multi_browserbase_stagehand_extract`: Extract structured data
- **Use Cases**:
  - Automated UI testing for feature validation
  - Screenshot capture for design reviews
  - User flow testing and regression detection
  - Cross-browser compatibility testing

**2. Exa MCP (exa)**
- **Purpose**: Advanced web search and research capabilities
- **Key Tools**:
  - `web_search_exa`: Real-time web search with content scraping
  - `company_research_exa`: Business intelligence and company analysis
  - `deep_researcher_start/check`: Comprehensive AI-powered research
  - `crawling_exa`: Extract content from specific URLs
- **Use Cases**:
  - Competitive analysis and market research
  - Technical documentation discovery
  - Library and framework comparison
  - Industry trend analysis

**3. OpenAPI MCP (janwilmake-openapi-mcp-server)**
- **Purpose**: API documentation analysis and integration support
- **Key Tools**:
  - `getApiOverview`: Analyze API structure and capabilities
  - `getApiOperation`: Detailed endpoint analysis
- **Supported APIs**: 150+ popular services (OpenAI, GitHub, Stripe, AWS, etc.)
- **Use Cases**:
  - API integration planning and implementation
  - Third-party service evaluation
  - API compatibility analysis
  - Documentation generation for integrations

**4. Context-7 MCP (upstash-context-7-mcp)**
- **Purpose**: Up-to-date library documentation and code examples
- **Key Tools**:
  - `resolve-library-id`: Find correct library identifiers
  - `get-library-docs`: Retrieve current documentation with code examples
- **Coverage**: 10,000+ libraries with trust scoring and version tracking
- **Use Cases**:
  - Current best practices for framework usage
  - Migration guides and upgrade paths
  - Code example generation
  - Architecture decision support

**5. Playwright MCP (cloudflare-playwright-mcp)**
- **Purpose**: Direct browser automation and testing
- **Key Tools**:
  - `browser_navigate`: URL navigation
  - `browser_click`: Element interaction
  - `browser_type`: Form input and text entry
  - `browser_snapshot`: Accessibility analysis
  - `browser_take_screenshot`: Visual validation
- **Use Cases**:
  - Local development testing
  - Accessibility auditing
  - Performance testing
  - Visual regression testing
</note>

<note title="Remote Agent Tool Permissions and Security">
**Enterprise-Grade Permission Management for MCP Tools**

**Permission Hierarchy:**
1. **Server-Level**: `mcp__server_name` (grants all tools from server)
2. **Tool-Level**: `mcp__server__specific_tool` (granular control)
3. **Pattern-Based**: `Bash(git*)` (wildcard matching for related tools)

**Security Configuration Pattern:**
```yaml
--allowed-tools "Read" "Write" "Edit"                           # Core file operations
--allowed-tools "Bash(git*)" "Bash(npm*)" "Bash(gh*)"         # Safe development commands
--allowed-tools "mcp__exa__web_search_exa"                    # Specific research tools
--allowed-tools "mcp__browserbasehq-mcp-browserbase"          # Full browser server access
```

**Risk Assessment by Tool Category:**
- **Low Risk**: Documentation access, web search, API analysis
- **Medium Risk**: Browser automation, file system operations
- **High Risk**: Shell commands, external API calls with credentials

**Best Practices:**
- **Principle of Least Privilege**: Grant minimum required permissions
- **Environment Variable Security**: Never commit API keys to repository
- **Tool-Specific Approval**: Use granular permissions over server-wide access
- **Audit Trail**: Enable telemetry for permission and tool usage monitoring

**GitHub Secrets Required:**
```
ANTHROPIC_API_KEY          # Claude Code authentication
EXA_API_KEY               # Web search and research capabilities
BROWSERBASE_API_KEY       # Cloud browser automation
BROWSERBASE_PROJECT_ID    # Browser session management
UPSTASH_REDIS_REST_URL    # Context-7 documentation cache
UPSTASH_REDIS_REST_TOKEN  # Context-7 authentication
```
</note>

<note title="Advanced GitHub Workflow Patterns">
**Sophisticated Remote Agent Automation Scenarios**

**Pattern 1: Intelligent PR Review with Research**
```yaml
# Triggered on PR creation
# Agent performs:
# 1. Code analysis with Context-7 for best practices
# 2. API compatibility check with OpenAPI MCP
# 3. Web research for security vulnerabilities
# 4. Browser testing of changed UI components
# 5. Comprehensive review comment with findings
```

**Pattern 2: Feature Development Validation**
```yaml
# Triggered on feature branch push
# Agent performs:
# 1. Automated UI testing with Playwright
# 2. Cross-browser compatibility testing with Browserbase
# 3. Performance impact analysis
# 4. Documentation gap identification
# 5. Integration test recommendations
```

**Pattern 3: Issue Triage and Research**
```yaml
# Triggered on issue creation
# Agent performs:
# 1. Similar issue research across GitHub
# 2. Stack Overflow and documentation search
# 3. Library version compatibility analysis
# 4. Reproduction step generation
# 5. Solution proposal with code examples
```

**Pattern 4: Dependency Update Assessment**
```yaml
# Triggered on dependency update PR
# Agent performs:
# 1. Breaking change analysis via API documentation
# 2. Migration guide research and summarization
# 3. Impact assessment on existing codebase
# 4. Test coverage verification
# 5. Rollback plan generation
```

**Configuration for Advanced Patterns:**
```yaml
claude_args: |
  --model claude-sonnet-4-20250514
  --max-turns 15                    # Extended turns for complex workflows
  --mcp-config .mcp.json
  --system-prompt "You are a senior technical lead with expertise in full-stack development, DevOps, and software architecture. Use your MCP tools strategically to provide comprehensive analysis and actionable recommendations."
```

**Monitoring and Observability:**
- **Telemetry**: Tool usage tracking and performance metrics
- **Cost Control**: Token usage monitoring per workflow
- **Success Metrics**: Issue resolution rate and PR approval efficiency
- **Error Handling**: Graceful degradation when MCP services unavailable
</note>
</notes>