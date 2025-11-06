import {Button, Flex, Heading, Text} from "@radix-ui/themes";
import React, {type ReactNode} from "react";

export default function BackupComplete(
  {
    title,
    description,
    children
  } : {
    title: string,
    description: string,
    children?: ReactNode
  }) {
  return (
    <Flex direction={'column'} gap={'6'}>
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <Heading size={'7'} className="" wrap={'pretty'}>
          {title || "Backup Complete"}
        </Heading>

        <Text size={'2'} color={'gray'}>
          {description || "Your seed phrase has been verified and saved securely"}
        </Text>
      </div>

      {/*<Card
                  // className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6"
                  variant={'surface'}
                >
                  <Text
                    // className="text-green-800 text-center"
                  >
                    Your wallet is now backed up and can be recovered using your seed phrase
                  </Text>
                </Card>*/}

      { children }

      <Button
        highContrast
        className={'w-full'}
        size={'3'}
        onClick={() => window.location.href = '/popup.html'}
        // className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
      >
        Return to Wallet
      </Button>
    </Flex>
  )
}
