import {Button, Card, Checkbox, Flex, Heading, Text} from "@radix-ui/themes";
import React, {useState} from "react";
import {ExplainSeedPhrase} from "~components/dialogs/ExplainSeedPhrase";

export default function SeedPhrase(
  {
    words,
    seedPhrase,
    setStep
  }: {
    words: string[],
    seedPhrase: string,
    setStep: any
  })
{
  const [agreedNeverShare, setAgreedNeverShare] = useState(false)
  const [agreedAnyoneAccess, setAgreedAnyoneAccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(seedPhrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Flex direction={'column'} gap={'6'}>
      <div className="text-center">
        {/*<div className="text-6xl mb-4">📝</div>*/}
        <Heading size={'7'} className="mb-2" wrap={'pretty'}>
          Your Seed Phrase
        </Heading>

        <ExplainSeedPhrase/> <br/>

        <Text hidden size={'2'} color={'gray'}>
          Write down these 12 words in the order they are displayed and keep them safe
        </Text>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {words.map((word, index) => (
          <Card
            className="h-12 py-1"
            key={index}
            variant={'classic'}
          >
            <Flex direction={'column'}>
              <Text color={'gray'} size={'1'} className="">{index + 1}.</Text>
              <Text size={'2'} className="font-mon" weight={'medium'}>{word}</Text>
            </Flex>
          </Card>
        ))}
      </div>

      <div hidden className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
        <p className="text-sm text-yellow-800 font-medium">
          ⚠️ <strong>Warning:</strong> Never share your seed phrase with anyone!
          Anyone with these words can access your funds.
        </p>
      </div>

      <Flex direction={'column'} gap={'2'}>
        <Text as="label" size="2">
          <Flex gap="2">
            <Checkbox
              color={'grass'}
              checked={agreedNeverShare}
              size={'1'}
              onCheckedChange={(checked) => setAgreedNeverShare(checked === true)}
            />
            I will never share your seed phrase with anyone.
          </Flex>
        </Text>

        <Text as="label" size="2">
          <Flex gap="2">
            <Checkbox
              color={'grass'}
              checked={agreedAnyoneAccess}
              size={'1'}
              onCheckedChange={(checked) => setAgreedAnyoneAccess(checked === true)}
            />
            I agree that anyone with these words can access my funds.
          </Flex>
        </Text>
      </Flex>

      <Flex align={'center'} className="" gap={'3'}>
        <Button
          highContrast
          className={'flex-1'}
          size={'2'}
          onClick={handleCopy}
          // className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
        >
          {
            copied
              ? <Flex justify={"between"} align={"center"} gap={"2"}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="green" viewBox="0 0 256 256">
                  <path
                    d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"></path>
                </svg>
                Copied
              </Flex>
              : <Flex justify={"between"} align={"center"} gap={"2"}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M216,40V168H168V88H88V40Z" opacity="0.2"></path>
                  <path
                    d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
                </svg>
                Copy
              </Flex>
          }
        </Button>
        <Button
          color={'grass'}
          size={'2'}
          disabled={!agreedNeverShare || !agreedAnyoneAccess}
          // className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
          onClick={() => setStep('verify-seed')}
        >
          I've Written It Down
        </Button>
      </Flex>

      <div hidden className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> Store your seed phrase in a secure location,
          like a safe or safety deposit box. Consider making multiple copies.
        </p>
      </div>
    </Flex>
  )
}
