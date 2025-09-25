
import Image from "next/image";


const Loader = () => (
  <div className="flex-center w-full">
    <Image
      src='/images/cards/loader.svg'
      alt="loader"
      width={24}
      priority={true}
      height={24}
      className="animate-spin"
    />
  </div>
);

export default Loader;