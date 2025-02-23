import { Mode, isToolAllowedForMode, getModeConfig, modes } from "../../shared/modes"
import { validateToolUse } from "../mode-validator"
import { TOOL_GROUPS } from "../../shared/tool-groups"
const [codeMode, architectMode, askMode] = modes.map((mode) => mode.slug)

describe("mode-validator", () => {
	describe("isToolAllowedForMode", () => {
		describe("code mode", () => {
			it("allows all code mode tools", () => {
				const mode = getModeConfig(codeMode)
				// Code mode has all groups
				Object.entries(TOOL_GROUPS).forEach(([_, config]) => {
					config.tools.forEach((tool: string) => {
						expect(isToolAllowedForMode(tool, codeMode, [])).toBe(true)
					})
				})
			})

			it("disallows unknown tools", () => {
				expect(isToolAllowedForMode("unknown_tool" as any, codeMode, [])).toBe(false)
			})
		})

		describe("architect mode", () => {
			it("allows configured tools", () => {
				const mode = getModeConfig(architectMode)
				// Architect mode has read, browser, and mcp groups
				const architectTools = [
					...TOOL_GROUPS.read.tools,
					...TOOL_GROUPS.browser.tools,
					...TOOL_GROUPS.mcp.tools,
				]
				architectTools.forEach((tool) => {
					expect(isToolAllowedForMode(tool, architectMode, [])).toBe(true)
				})
			})
		})

		describe("ask mode", () => {
			it("allows configured tools", () => {
				const mode = getModeConfig(askMode)
				// Ask mode has read, browser, and mcp groups
				const askTools = [...TOOL_GROUPS.read.tools, ...TOOL_GROUPS.browser.tools, ...TOOL_GROUPS.mcp.tools]
				askTools.forEach((tool) => {
					expect(isToolAllowedForMode(tool, askMode, [])).toBe(true)
				})
			})
		})

		describe("custom modes", () => {
			it("allows tools from custom mode configuration", () => {
				const customModes = [
					{
						slug: "custom-mode",
						name: "Custom Mode",
						roleDefinition: "Custom role",
						groups: ["read", "edit"] as const,
					},
				]
				// Should allow tools from read and edit groups
				expect(isToolAllowedForMode("read_file", "custom-mode", customModes)).toBe(true)
				expect(isToolAllowedForMode("write_to_file", "custom-mode", customModes)).toBe(true)
				// Should not allow tools from other groups
				expect(isToolAllowedForMode("execute_command", "custom-mode", customModes)).toBe(false)
			})

			it("allows custom mode to override built-in mode", () => {
				const customModes = [
					{
						slug: codeMode,
						name: "Custom Code Mode",
						roleDefinition: "Custom role",
						groups: ["read"] as const,
					},
				]
				// Should allow tools from read group
				expect(isToolAllowedForMode("read_file", codeMode, customModes)).toBe(true)
				// Should not allow tools from other groups
				expect(isToolAllowedForMode("write_to_file", codeMode, customModes)).toBe(false)
			})

			it("respects tool requirements in custom modes", () => {
				const customModes = [
					{
						slug: "custom-mode",
						name: "Custom Mode",
						roleDefinition: "Custom role",
						groups: ["edit"] as const,
					},
				]
				const requirements = { edit_file: false }

				// Should respect disabled requirement even if tool group is allowed
				expect(isToolAllowedForMode("edit_file", "custom-mode", customModes, requirements)).toBe(false)

				// Should allow other edit tools
				expect(isToolAllowedForMode("write_to_file", "custom-mode", customModes, requirements)).toBe(true)
			})
		})

		describe("tool requirements", () => {
			it("respects tool requirements when provided", () => {
				const requirements = { edit_file: false }
				expect(isToolAllowedForMode("edit_file", codeMode, [], requirements)).toBe(false)

				const enabledRequirements = { edit_file: true }
				expect(isToolAllowedForMode("edit_file", codeMode, [], enabledRequirements)).toBe(true)
			})

			it("allows tools when their requirements are not specified", () => {
				const requirements = { some_other_tool: true }
				expect(isToolAllowedForMode("edit_file", codeMode, [], requirements)).toBe(true)
			})

			it("handles undefined and empty requirements", () => {
				expect(isToolAllowedForMode("edit_file", codeMode, [], undefined)).toBe(true)
				expect(isToolAllowedForMode("edit_file", codeMode, [], {})).toBe(true)
			})

			it("prioritizes requirements over mode configuration", () => {
				const requirements = { edit_file: false }
				// Even in code mode which allows all tools, disabled requirement should take precedence
				expect(isToolAllowedForMode("edit_file", codeMode, [], requirements)).toBe(false)
			})
		})
	})

	describe("validateToolUse", () => {
		it("throws error for disallowed tools in architect mode", () => {
			expect(() => validateToolUse("unknown_tool" as any, "architect", [])).toThrow(
				'Tool "unknown_tool" is not allowed in architect mode.',
			)
		})

		it("does not throw for allowed tools in architect mode", () => {
			expect(() => validateToolUse("read_file", "architect", [])).not.toThrow()
		})

		it("throws error when tool requirement is not met", () => {
			const requirements = { edit_file: false }
			expect(() => validateToolUse("edit_file", codeMode, [], requirements)).toThrow(
				'Tool "edit_file" is not allowed in code mode.',
			)
		})

		it("does not throw when tool requirement is met", () => {
			const requirements = { edit_file: true }
			expect(() => validateToolUse("edit_file", codeMode, [], requirements)).not.toThrow()
		})

		it("handles undefined requirements gracefully", () => {
			expect(() => validateToolUse("edit_file", codeMode, [], undefined)).not.toThrow()
		})
	})
})
