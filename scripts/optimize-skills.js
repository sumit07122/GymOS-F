const fs = require("fs");
const path = require("path");

const skillsDir = path.join(__dirname, "..", ".agents", "skills");

const descriptions = {
  "architecture-review":
    "Reviews system architecture and module boundaries. Use automatically when the user asks to review architecture, evaluate tech stack, assess scalability, design modules, or plan system structure.",
  brainstorming:
    "Generates creative technical and product ideas. Use automatically when the user asks to brainstorm features, explore product concepts, ideate solutions, design new capabilities, or plan SaaS functionality.",
  "code-review":
    "Audits code quality, clean code standards, and patterns. Use automatically when the user asks to review code, audit pull requests, check code quality, improve maintainability, or inspect diffs.",
  "context-budget":
    "Optimizes prompt length and context token efficiency. Use automatically when the user asks to manage context, reduce tokens, optimize conversation window, compact prompts, or budget LLM memory.",
  "debugging-strategies":
    "Applies systematic multi-step troubleshooting methodologies. Use automatically when the user asks to troubleshoot complex issues, isolate race conditions, analyze system failures, or diagnose hard bugs.",
  "design-an-interface":
    "Designs modern web interfaces and page layouts. Use automatically when the user asks to design an interface, create layouts, build web screens, structure views, or mock dashboard UI.",
  "design-system":
    "Defines cohesive design tokens, colors, and typography. Use automatically when the user asks to build design systems, establish design tokens, style palettes, typography guidelines, or brand variables.",
  "frontend-a11y":
    "Audits accessibility compliance and WCAG standards. Use automatically when the user asks to audit accessibility, fix a11y, ensure screen reader support, keyboard navigation, or WCAG contrast.",
  "frontend-design":
    "Crafts aesthetic, modern, high-conversion frontend UI. Use automatically when the user asks to design frontend, build landing pages, style web components, polish visual aesthetic, or create UI.",
  "frontend-patterns":
    "Implements reusable frontend component architecture. Use automatically when the user asks to architect frontend patterns, organize UI components, create hooks, or structure client state.",
  "liquid-glass-design":
    "Applies modern glassmorphic and blur aesthetics. Use automatically when the user asks for glassmorphism, blur effects, frosted glass styling, gradient cards, or modern dark-mode visuals.",
  "make-interfaces-feel-better":
    "Polishes micro-interactions, animations, and transitions. Use automatically when the user asks to polish UI, make interfaces feel better, add hover effects, smooth animations, or micro-interactions.",
  "nextjs-app-router-patterns":
    "Implements Next.js App Router patterns, layouts, and server actions. Use automatically when the user asks to build Next.js pages, route handlers, server components, layouts, or server actions.",
  "nextjs-turbopack":
    "Optimizes Next.js Turbopack configuration and build performance. Use automatically when the user asks to optimize Next.js builds, configure Turbopack, fix bundler issues, or speed up dev server.",
  playwright:
    "Executes browser end-to-end testing and visual UI verification. Use automatically when the user asks to run E2E tests, verify web routes, test browser workflows, validate forms, or capture screenshots.",
  "prompt-optimizer":
    "Refines and sharpens prompts for autonomous agents. Use automatically when the user asks to optimize prompts, improve instructions, engineer system prompts, or sharpen agent briefs.",
  "react-modernization":
    "Upgrades React codebases to React 19 standards. Use automatically when the user asks to modernize React, upgrade to React 19, adopt Server Actions, useActionState, or refactor legacy hooks.",
  "react-patterns":
    "Implements battle-tested React architecture and custom hooks. Use automatically when the user asks to write React components, design custom hooks, manage component state, or build modular views.",
  "react-performance":
    "Profiles and eliminates React re-render bottlenecks. Use automatically when the user asks to optimize React performance, eliminate laggy re-renders, use memoization, or tune component renders.",
  "systematic-debugging":
    "Diagnoses root causes and fixes errors systematically. Use automatically when the user asks to debug bugs, fix errors, resolve crashes, investigate exceptions, or repair broken functionality.",
  "tailwind-design-system":
    "Implements scalable Tailwind CSS utilities, themes, and classes. Use automatically when the user asks to style with Tailwind, configure tailwind themes, write utility classes, or build responsive UI.",
  "web-performance-optimization":
    "Tunes Core Web Vitals, asset loading, and bundle size. Use automatically when the user asks to optimize web performance, improve Core Web Vitals, reduce bundle sizes, or speed up page load.",
  "writing-plans":
    "Creates structured, actionable engineering execution plans. Use automatically when the user asks to plan a feature, write implementation plans, breakdown tasks, or architect technical roadmaps.",
};

for (const [skillName, desc] of Object.entries(descriptions)) {
  const skillFile = path.join(skillsDir, skillName, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    console.warn("Skill file missing:", skillFile);
    continue;
  }

  let content = fs.readFileSync(skillFile, "utf8");

  // Check if YAML frontmatter exists
  if (content.startsWith("---")) {
    const secondDelim = content.indexOf("\n---", 3);
    if (secondDelim !== -1) {
      const frontmatter = content.slice(3, secondDelim);
      const rest = content.slice(secondDelim + 4);

      // Check description length
      if (desc.length > 250) {
        console.error(`Description too long (${desc.length} chars) for ${skillName}`);
      }

      // Replace or insert description
      let newFm = frontmatter;
      if (/description:.*$/m.test(newFm)) {
        newFm = newFm.replace(/description:.*$/m, `description: "${desc.replace(/"/g, '\\"')}"`);
      } else {
        newFm = newFm.trim() + `\ndescription: "${desc.replace(/"/g, '\\"')}"\n`;
      }

      content = `---${newFm}\n---${rest}`;
    }
  } else {
    // Add frontmatter
    content = `---\nname: ${skillName}\ndescription: "${desc.replace(/"/g, '\\"')}"\n---\n\n${content}`;
  }

  fs.writeFileSync(skillFile, content, "utf8");
  console.log(`Updated ${skillName} (${desc.length} chars)`);
}
