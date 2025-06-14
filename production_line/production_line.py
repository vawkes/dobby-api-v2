import boto3
import json
import os
import sys
import traceback
import time
from datetime import datetime
from dotenv import load_dotenv
import subprocess
from pynrfjprog import LowLevel, API

# Load environment variables
load_dotenv()

def validate_environment():
    """
    Validate that all required environment variables are set
    """
    required_vars = [
        'AWS_PROFILE',
        'DYNAMODB_TABLE_NAME',
        'SIDEWALK_DESTINATION_NAME',
        'SIDEWALK_DEVICE_PROFILE_ID',
        'FIRMWARE_HEX_PATH'  # New environment variable for firmware hex file
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("\nError: Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        return False
        
    return True

class ProductionLine:
    def __init__(self):
        if not validate_environment():
            sys.exit(1)
            
        try:
            # Create session with specified profile
            session = boto3.Session(profile_name=os.getenv('AWS_PROFILE'))
            
            # Initialize clients using the session
            self.dynamodb = session.resource('dynamodb')
            self.table = self.dynamodb.Table(os.getenv('DYNAMODB_TABLE_NAME'))
            self.sidewalk_client = session.client('iotwireless')
            self.iot_client = session.client('iot')  # Add IoT client
            
            # Create device_files directory if it doesn't exist
            self.device_files_dir = os.path.join(os.path.dirname(__file__), 'device_files')
            os.makedirs(self.device_files_dir, exist_ok=True)
            
        except Exception as e:
            print(f"\nError initializing AWS clients:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            sys.exit(1)

    def save_json_file(self, filepath, data):
        """
        Save JSON data to a file
        """
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            # Save the JSON data
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            
            return filepath
        except Exception as e:
            print(f"\nError saving JSON file {data}:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            raise

    def get_device_profile(self, profile_id):
        """
        Get device profile information
        """
        try:
            response = self.sidewalk_client.get_device_profile(
                Id=profile_id
            )
            return response
        except Exception as e:
            print(f"\nError getting device profile:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            raise

    def get_wireless_device(self, device_id):
        """
        Get wireless device information
        """
        try:
            response = self.sidewalk_client.get_wireless_device(
                Identifier=device_id,
                IdentifierType='WirelessDeviceId'
            )
            return response
        except Exception as e:
            print(f"\nError getting wireless device:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            raise

    def provision_device(self, device_id, device_profile_json, wireless_device_json):
        """
        Create a manufacturing binary image for the device using the provision.py script
        """
        try:
            # Get the path to the provision.py script
            provision_script = "/opt/nordic/ncs/v2.5.0/sidewalk/tools/aws-iot-core-for-sidewalk/EdgeDeviceProvisioning/tools/provision/provision.py"
            
            # Create output directory for the binary files
            output_dir = os.path.join("device_files", device_id)
            os.makedirs(output_dir, exist_ok=True)
            
            # Define output paths
            output_bin = os.path.join(output_dir, f"{device_id}_mfg.bin")
            output_hex = os.path.join(output_dir, f"{device_id}_mfg.hex")
            
            # Run the provision.py script
            cmd = [
                "python",
                provision_script,
                "nordic",
                "aws",
                "--wireless_device_json", wireless_device_json,
                "--device_profile_json", device_profile_json,
                "--output_bin", output_bin,
                "--output_hex", output_hex
            ]
            
            print("\nRunning provisioning script...")
            print(f"Command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"Error running provisioning script:")
                print(f"Error output: {result.stderr}")
                raise Exception("Failed to run provisioning script")
            
            # Check if the output files were created
            if not os.path.exists(output_bin):
                print(f"Warning: Expected output file not found: {output_bin}")
                print("Script output:")
                print(result.stdout)
                raise Exception("Manufacturing binary file was not created")
            
            print(f"\nProvisioning completed successfully!")
            print(f"Manufacturing binary saved to: {output_bin}")
            print(f"Manufacturing hex file saved to: {output_hex}")
            
            return True
            
        except Exception as e:
            print(f"\nError during provisioning:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            return False

    def flash_device(self, device_id):
        """
        Flash the device with both the manufacturing hex file and firmware hex file using pynrfjprog
        """
        try:
            # Get paths for both hex files
            mfg_hex_path = os.path.join("device_files", device_id, f"{device_id}_mfg.hex")
            firmware_hex_path = os.getenv('FIRMWARE_HEX_PATH')
            
            if not os.path.exists(mfg_hex_path):
                raise Exception(f"Manufacturing hex file not found: {mfg_hex_path}")
            
            if not os.path.exists(firmware_hex_path):
                raise Exception(f"Firmware hex file not found: {firmware_hex_path}")
            
            # Initialize pynrfjprog
            with API.API('NRF52') as api:  # Using string 'NRF52' instead of DeviceFamily enum
                # Enumerate connected devices
                print("\nEnumerating connected devices...")
                serial_numbers = api.enum_emu_snr()
                
                if not serial_numbers:
                    raise Exception("No nRF devices found. Please connect a device and try again.")
                
                # Connect to the first available device
                print(f"Connecting to device with serial number: {serial_numbers[0]}")
                api.connect_to_emu_with_snr(serial_numbers[0])
                
                # Recover the device
                print("\nRecovering device...")
                api.recover()
                
                # Erase all
                print("Erasing device...")
                api.erase_all()
                
                # Flash manufacturing hex file
                print("\nFlashing manufacturing hex file...")
                api.program_file(mfg_hex_path)
                print("Manufacturing hex file flashed successfully")
                
                # Flash firmware hex file
                print("\nFlashing firmware hex file...")
                api.program_file(firmware_hex_path)
                print("Firmware hex file flashed successfully")
                
                # Reset sequence
                print("\nResetting device...")
                api.go()  # Start execution
                time.sleep(0.1)  # Short delay
                api.sys_reset()  # System reset
                time.sleep(0.1)  # Short delay
                api.go()  # Start execution again
                print("Device reset complete")
            
            print("\nDevice flashed successfully!")
            return True
            
        except Exception as e:
            print(f"\nError during device flashing:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            return False

    def create_sidewalk_device(self, device_id):
        """
        Create a new Sidewalk device
        """
        try:
            print(f"\nCreating Sidewalk device {device_id}...")
            response = self.sidewalk_client.create_wireless_device(
                Type='Sidewalk',
                Name=device_id,
                DestinationName=os.getenv('SIDEWALK_DESTINATION_NAME'),
                Sidewalk={
                    'DeviceProfileId': os.getenv('SIDEWALK_DEVICE_PROFILE_ID')
                }
            )
            
            print(f"Created Sidewalk device with ID: {response['Id']}")
            print(f"Device ARN: {response['Arn']}")
            
            # Store in DynamoDB
            self.store_device_info(device_id, response['Id'], response['Arn'], None)
            
            return response['Id'], response['Arn']  # Return both ID and ARN
            
        except Exception as e:
            print(f"\nError creating Sidewalk device:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            raise

    def create_iot_thing(self, device_id):
        """
        Create an IoT thing and associate it with the Sidewalk device
        """
        try:
            # Create the IoT thing
            print(f"\nCreating IoT thing for device {device_id}...")
            response = self.iot_client.create_thing(
                thingName=device_id,
                attributePayload={
                    'attributes': {
                        'deviceType': 'sidewalk',
                        'createdAt': datetime.utcnow().isoformat()
                    },
                    'merge': True
                }
            )
            
            thing_arn = response['thingArn']
            print(f"Created IoT thing with ARN: {thing_arn}")
            
            return thing_arn
            
        except Exception as e:
            print(f"\nError creating IoT thing:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            raise

    def associate_thing_with_sidewalk_device(self, thing_arn, wireless_device_id):
        """
        Associate the IoT thing with the Sidewalk device
        """
        try:
            print(f"\nAssociating IoT thing with Sidewalk device {wireless_device_id}...")
            response = self.sidewalk_client.associate_wireless_device_with_thing(
                Id=wireless_device_id,
                ThingArn=thing_arn
            )
            print("Successfully associated IoT thing with Sidewalk device")
            return True
            
        except Exception as e:
            print(f"\nError associating IoT thing with Sidewalk device:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            raise

    def store_device_info(self, device_id, wireless_device_id, wireless_device_arn, thing_arn):
        """
        Store device information in DynamoDB
        """
        try:
            item = {
                'deviceId': device_id,
                'wireless_device_id': wireless_device_id,
                'wireless_device_arn': wireless_device_arn,
                'thing_arn': thing_arn,
                'created_at': datetime.utcnow().isoformat(),
                'status': 'active'
            }
            
            self.table.put_item(Item=item)
            print(f"\nDevice information stored in DynamoDB")
            
        except Exception as e:
            print(f"\nError storing device information:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            raise

    def process_device(self, device_id):
        """
        Process a single device through the production line
        """
        try:
            # Create Sidewalk device
            wireless_device_id, wireless_device_arn = self.create_sidewalk_device(device_id)
            
            # Create IoT thing
            thing_arn = self.create_iot_thing(device_id)
            
            # Associate thing with Sidewalk device
            self.associate_thing_with_sidewalk_device(thing_arn, wireless_device_id)
            
            # Store device information
            self.store_device_info(device_id, wireless_device_id, wireless_device_arn, thing_arn)
            
            # Get device profile and wireless device information
            device_profile = self.get_device_profile(os.getenv('SIDEWALK_DEVICE_PROFILE_ID'))
            wireless_device = self.get_wireless_device(wireless_device_id)
            
            # Save device profile and wireless device information
            device_profile_path = self.save_json_file(
                os.path.join(self.device_files_dir, device_id, 'device_profile.json'),
                device_profile
            )
            wireless_device_path = self.save_json_file(
                os.path.join(self.device_files_dir, device_id, 'wireless_device.json'),
                wireless_device
            )
            
            # Provision device
            if not self.provision_device(device_id, device_profile_path, wireless_device_path):
                raise Exception("Device provisioning failed")
            
            # Flash device
            if not self.flash_device(device_id):
                raise Exception("Device flashing failed")
            
            print(f"\nDevice {device_id} processed successfully!")
            return True
            
        except Exception as e:
            print(f"\nError processing device {device_id}:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print("\nFull traceback:")
            traceback.print_exc()
            return False

def main():
    """
    Main function to run the production line application
    """
    try:
        # Initialize the production line
        production_line = ProductionLine()
        
        while True:
            try:
                # Get device ID from user
                device_id = input("\nEnter device ID (or 'q' to quit): ").strip()
                
                if device_id.lower() == 'q':
                    print("\nExiting production line application. Goodbye!")
                    break
                    
                if not device_id:
                    print("\nError: Device ID cannot be empty")
                    continue
                    
                # Process the device
                result = production_line.process_device(device_id)
                
                if result:
                    print("\nDevice processed successfully!")
                else:
                    print("\nError processing device:")
                    print("Please try again or contact support if the issue persists.")
                    
            except KeyboardInterrupt:
                print("\n\nExiting production line application. Goodbye!")
                break
            except Exception as e:
                print(f"\nUnexpected error:")
                print(f"Exception type: {type(e).__name__}")
                print(f"Exception message: {str(e)}")
                print("\nFull traceback:")
                traceback.print_exc()
                print("Please try again or contact support if the issue persists.")
                
    except Exception as e:
        print(f"\nFatal error initializing production line:")
        print(f"Exception type: {type(e).__name__}")
        print(f"Exception message: {str(e)}")
        print("\nFull traceback:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main() 