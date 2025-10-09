import { Button, Dialog, Flex } from "@radix-ui/themes"
import { LucideScan } from "lucide-react"
import React, { useState } from "react"
import {Scanner, useDevices} from "@yudiel/react-qr-scanner";

export default function QRCodeScanner({ callback }: { callback: (arg: string) => void }) {
  const [openScanner, setOpenScanner] = useState<boolean>(false)
  // const ans = useDevices()
  // console.log(ans)

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button variant={"soft"} radius={"large"} style={{ height: "100%" }} onClick={() => setOpenScanner(true)}>
          <LucideScan />
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth={{initial: "100%", lg: "480px"}} height={"96dvh"} style={{
        // background: "purple",
        padding: 0
      }}>
        <Dialog.Title style={{paddingInline: "1rem", paddingTop: "1.4rem"}}>
          Scan QRCode
        </Dialog.Title>
        <Dialog.Description size="2" mb="4" style={{padding: "0.8rem"}}>
          Scan a QR Code to copy it&apos;s Address
        </Dialog.Description>

        <Flex
          direction="column"
          align={"center"}
          gap="3"
          style={{
            padding: "8px",
            // backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            // border: "1px solid #eaeaea",
            // height: "100%",
            display: "flex",
            flexFlow: "row nowrap",
            alignItems: "center"
          }}
        >
          {openScanner && (
            // <QrReader
            //   onResult={(result, error) => {
            //     if (!!result) {
            //       // setTransaction({ ...transaction, to: result?.getText() })
            //       callback(result?.getText())
            //     }
            //
            //     if (!!error) {
            //       console.info(error)
            //     }
            //
            //     setOpenScanner(false)
            //   }}
            //   // @ts-ignore
            //   // style={{ width: "100%", maxWidth: '400px', height: '500px' }}
            //   // videoStyle={{ width: "100%", height: '100%' }}
            //   constraints={{ facingMode: "environment" }}
            // />

            <Scanner
              onScan={(result) => console.log(result)}
              styles={{
                container: {
                  // background: "orangered",
                  display: "flex",
                  flexFlow: "column nowrap",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  borderRadius: "8px",
                  overflow: "hidden",
                },
                video: {
                  // background: "green",
                  width: "100%",
                  // height: "100%",
                  objectFit: "contain",
                },
                finderBorder: 0
              }}
              components={{
                audio: true,
                finder: true,
                torch: true,
                onOff: true,
              }}
            />
          )}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" onClick={() => setOpenScanner(false)}>
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
