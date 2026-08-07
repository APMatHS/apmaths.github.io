import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://yhfburffwzvcayjadskr.supabase.co";

const supabaseKey = "sb_publishable_TcYRYTrR3VZgOoyH0Ye1hQ_d-Jm4UwL";

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from("test")
  .select("*");

console.log(data);
console.log(error);