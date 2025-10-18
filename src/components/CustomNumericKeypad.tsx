import React from "react"
import {Box, Button, Flex, Grid, IconButton, Text} from "@radix-ui/themes";
import { LucideArrowLeft, LucideArrowRightLeft } from "lucide-react";

interface NumericKeypadProps {
    maxValue: string
    inputValue: string
    setInputValue: React.Dispatch<React.SetStateAction<string>>
    onSubmit?: (value: string) => void
    allowDecimal?: boolean
    maxLength?: number
    tokenSymbol: string
    onEthValueChange?: (ethValue: string) => void // Callback to notify parent of ETH value changes
}

const NumericKeypad: React.FC<NumericKeypadProps> = ({
    maxValue,
    inputValue,
    setInputValue,
    onSubmit,
    allowDecimal = true,
    maxLength = 10,
    tokenSymbol,
    onEthValueChange
}) => {
    // Input mode state: "ETH" or "USD"
    const [inputMode, setInputMode] = React.useState<"ETH" | "USD">("ETH")

    // ETH price in USD (matching the price used in send.tsx)
    const ETH_PRICE_USD = 3000

    // Convert between ETH and USD
    const convertEthToUsd = (ethAmount: string): string => {
        const ethValue = parseFloat(ethAmount) || 0
        return (ethValue * ETH_PRICE_USD).toFixed(2)
    }

    const convertUsdToEth = (usdAmount: string): string => {
        const usdValue = parseFloat(usdAmount) || 0
        return (usdValue / ETH_PRICE_USD).toFixed(6)
    }

    // Get display values based on current mode
    const getDisplayValues = () => {
        if (inputMode === "ETH") {
            const ethAmount = inputValue || "0"
            const usdAmount = convertEthToUsd(ethAmount)
            return { primary: ethAmount, secondary: usdAmount, primarySymbol: "ETH", secondarySymbol: "$" }
        } else {
            const usdAmount = inputValue || "0"
            const ethAmount = convertUsdToEth(usdAmount)
            return { primary: usdAmount, secondary: ethAmount, primarySymbol: "$", secondarySymbol: "ETH" }
        }
    }

    // Notify parent component of ETH value changes
    React.useEffect(() => {
        if (onEthValueChange) {
            const ethValue = inputMode === "ETH"
                ? inputValue || "0"
                : convertUsdToEth(inputValue || "0")
            onEthValueChange(ethValue)
        }
    }, [inputValue, inputMode, onEthValueChange])

    const handleKeyPress = (key: string) => {
        if (key === "clear") {
            setInputValue("")
        } else if (key === "max") {
            if (inputMode === "ETH") {
                setInputValue(maxValue) // Set max ETH value
            } else {
                // Set max USD value based on max ETH balance
                const maxUsdValue = convertEthToUsd(maxValue)
                setInputValue(maxUsdValue)
            }
        } else if (key === "backspace") {
            setInputValue((prev) => prev.slice(0, -1))
        } else if (key === "submit") {
            onSubmit?.(inputValue)
        } else {
            if (inputValue.length < maxLength) {
                if (key === "." && allowDecimal && !inputValue.includes(".")) {
                    setInputValue((prev) => prev + key)
                } else if (!isNaN(Number(key))) {
                    setInputValue((prev) => prev + key)
                }
            }
        }
    }

    const toggleInputMode = () => {
        const currentEthValue = inputMode === "ETH"
            ? inputValue || "0"
            : convertUsdToEth(inputValue || "0")

        setInputMode(prev => prev === "ETH" ? "USD" : "ETH")

        if (inputValue) {
            if (inputMode === "ETH") {
                // Convert current ETH to USD for display
                const usdValue = convertEthToUsd(inputValue)
                setInputValue(usdValue)
            } else {
                // Convert current USD to ETH for display
                const ethValue = convertUsdToEth(inputValue)
                setInputValue(ethValue)
            }
        }
    }

    const keypadButtons = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        allowDecimal ? "." : "",
        "0",
        inputValue === "" ? "max" : "backspace",
    ].filter(Boolean)

    const displayValues = getDisplayValues()
    const fontSize = Math.max(12, 50 - inputValue.length * 2)

    return (
        <Flex
            direction={"column"}
            align={"center"}
            gap={"3"}
        // style={{
        //   display: "flex",
        //   flexDirection: "column",
        //   alignItems: "center",
        //   gap: "10px",
        // }}
        >
            {/* Display */}

            <Flex
                px={"3"}
                py={"3"}
                gap={"3"}
                align={"center"}
                className={"relative w-full"}
                style={
                    {
                        // width: "200px",
                        // padding: "10px",
                        // border: "1px solid #ccc",
                        // borderRadius: "4px",
                        // fontSize: "18px",
                        // textAlign: "right",
                    }
                }
            >
                <Box className={"absolute -bottom-2 left-0 right-0"}>
                    <Flex align={'center'} justify={'center'} gap={'1'}>
                        <Text weight={"bold"} size={"3"} align={"center"} color={"gray"} style={{ opacity: "0.8" }}>
                            (<Text size={"3"} color={"gray"}>
                                {displayValues.secondarySymbol}
                            </Text>
                            {displayValues.secondary})
                        </Text>
                    </Flex>
                </Box>

                <IconButton
                  size={'3'}
                  variant={"soft"}
                  onClick={toggleInputMode}
                  // className={"relative rounded-large bg-[var(--gray-2)] hover:bg-[var(--gray-3)]"}
                  // style={{ borderRadius: "12px", minWidth: "48px" }}
                >
                    <LucideArrowRightLeft size={20} />
                </IconButton>

                <Text
                    size={"9"}
                    className={"w-full overflow-auto whitespace-nowrap text-center font-bold"}
                    style={{
                        fontSize: `${fontSize}px`,
                        paddingBlock: "0.5rem",
                    }}
                >
                    {displayValues.primary || "0"}
                </Text>

                <Text align={'center'} size={"5"} className={"font-bold text-gray-400 w-16"} truncate trim={"end"}>
                    {displayValues.primarySymbol}
                </Text>
            </Flex>

            {/* Keypad */}
            <Grid
                columns={"3"}
                gap={"1"}
                rows={"repeat(1, 1fr)"}
                width={"100%"}
                p={"1"}
                style={
                    {
                        // display: "grid",
                        // gridTemplateColumns: "repeat(3, 1fr)",
                        // gap: "10px",
                        // background: "orange",
                    }
                }
            >
                {keypadButtons.map((key) => (
                    <Button
                        key={key}
                        variant={"ghost"}
                        size={"4"}
                        onClick={() => handleKeyPress(key)}
                        style={{
                            cursor: "pointer",
                            userSelect: "none",
                            height: "48px",
                            // fontSize: "22px",
                            fontWeight: "bold",
                        }}
                    >
                        {key === "clear" ? "C" : key === "max" ? "Max" : key === "backspace" ? <LucideArrowLeft size={20} strokeWidth={3} /> : key}
                    </Button>
                ))}
            </Grid>

            {/* Submit Button */}
            {/*<button
        onClick={() => handleKeyPress("submit")}
        style={{
          marginTop: "10px",
          padding: "10px 20px",
          fontSize: "18px",
          backgroundColor: "#007BFF",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Submit
      </button>*/}
        </Flex>
    )
}

export default NumericKeypad
